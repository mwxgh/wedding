#!/usr/bin/env bash
# Copy production data (MySQL + RustFS bucket) into the local dev stack and
# align local secrets with the server so encrypted settings keep working.
#
# Usage (from repo root, needs SSH key access to the server):
#   pnpm prod:pull                 # DB + photos + env
#   SKIP_S3=1 pnpm prod:pull       # DB + env only
#
# Env overrides: PROD_SSH (default root@103.70.13.117), LOCAL_S3_PORT_FWD (19000)
set -euo pipefail

PROD_SSH=${PROD_SSH:-root@103.70.13.117}
FWD_PORT=${LOCAL_S3_PORT_FWD:-19000}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DEPLOY_ENV="$ROOT/deploy/.env"
API_ENV="$ROOT/apps/api/.env"
BACKUP_DIR="$ROOT/deploy/backups"
STAMP=$(date +%Y%m%d-%H%M%S)

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mxx\033[0m %s\n' "$*" >&2; exit 1; }

for f in "$DEPLOY_ENV" "$API_ENV"; do [[ -f $f ]] || die "missing $f (copy from .env.example)"; done
ssh -o BatchMode=yes -o ConnectTimeout=10 "$PROD_SSH" true 2>/dev/null \
  || die "cannot SSH to $PROD_SSH with a key. Run: ssh-copy-id $PROD_SSH"

# --- read prod settings from the running containers -------------------------
remote_ctr() { ssh "$PROD_SSH" "docker ps -q --filter label=com.docker.compose.service=$1 | head -1"; }
API_CTR=$(remote_ctr api);     [[ -n $API_CTR ]] || die "prod api container not running"
MYSQL_CTR=$(remote_ctr mysql); [[ -n $MYSQL_CTR ]] || die "prod mysql container not running"

prod_env() { # $1 = container, $2 = var name
  ssh "$PROD_SSH" "docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' $1" \
    | sed -n "s/^$2=//p" | head -1
}

log "Reading prod env"
P_SETTINGS_SECRET=$(prod_env "$API_CTR" SETTINGS_SECRET)
P_JWT_EXPIRES_IN=$(prod_env "$API_CTR" JWT_EXPIRES_IN)
P_UPLOAD_MAX_MB=$(prod_env "$API_CTR" UPLOAD_MAX_MB)
P_PAYOS_TTL=$(prod_env "$API_CTR" PAYOS_TTL_MINUTES)
P_S3_BUCKET=$(prod_env "$API_CTR" S3_BUCKET)
P_S3_ACCESS=$(prod_env "$API_CTR" S3_ACCESS_KEY)
P_S3_SECRET=$(prod_env "$API_CTR" S3_SECRET_KEY)
P_DB=$(prod_env "$MYSQL_CTR" MYSQL_DATABASE)
[[ -n $P_SETTINGS_SECRET && -n $P_DB ]] || die "could not read prod env"

# --- local env --------------------------------------------------------------
set_env() { # file key value
  local file=$1 key=$2 val=$3
  [[ -n $val ]] || return 0
  if grep -q "^$key=" "$file"; then
    KEY="$key" VAL="$val" perl -i -pe 's/^\Q$ENV{KEY}\E=.*/$ENV{KEY}=$ENV{VAL}/' "$file"
  else
    printf '%s=%s\n' "$key" "$val" >>"$file"
  fi
}

log "Updating apps/api/.env"
set_env "$API_ENV" SETTINGS_SECRET "$P_SETTINGS_SECRET"
set_env "$API_ENV" JWT_EXPIRES_IN "$P_JWT_EXPIRES_IN"
set_env "$API_ENV" UPLOAD_MAX_MB "$P_UPLOAD_MAX_MB"
set_env "$API_ENV" PAYOS_TTL_MINUTES "$P_PAYOS_TTL"
set_env "$API_ENV" S3_BUCKET "$P_S3_BUCKET"

# --- local infra ------------------------------------------------------------
set -a; source "$DEPLOY_ENV"; set +a
infra() { docker compose -f "$ROOT/deploy/docker-compose.yml" --env-file "$DEPLOY_ENV" "$@"; }
log "Starting local mysql + rustfs"
infra up -d --wait mysql rustfs

# --- database ---------------------------------------------------------------
mkdir -p "$BACKUP_DIR"
DUMP="$BACKUP_DIR/prod-$P_DB-$STAMP.sql.gz"
log "Dumping prod database '$P_DB' -> ${DUMP#$ROOT/}"
ssh "$PROD_SSH" "docker exec $MYSQL_CTR sh -c 'exec mysqldump -uroot -p\"\$MYSQL_ROOT_PASSWORD\" \
  --single-transaction --quick --routines --triggers --no-tablespaces --set-gtid-purged=OFF \"\$MYSQL_DATABASE\"' | gzip -c" >"$DUMP"
[[ $(gzip -dc "$DUMP" | tail -1) == *"Dump completed"* ]] || die "dump looks incomplete"

LOCAL_BAK="$BACKUP_DIR/local-$MYSQL_DATABASE-$STAMP.sql.gz"
log "Backing up local '$MYSQL_DATABASE' -> ${LOCAL_BAK#$ROOT/}"
infra exec -T mysql sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --no-tablespaces "$MYSQL_DATABASE"' \
  2>/dev/null | gzip -c >"$LOCAL_BAK"

log "Importing into local '$MYSQL_DATABASE'"
infra exec -T mysql sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS \`$MYSQL_DATABASE\`; CREATE DATABASE \`$MYSQL_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL ON \`$MYSQL_DATABASE\`.* TO \"$MYSQL_USER\"@\"%\";"' 2>/dev/null
gzip -dc "$DUMP" | infra exec -T mysql sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' 2>/dev/null

# --- photos (RustFS) --------------------------------------------------------
if [[ -z ${SKIP_S3:-} && -n $P_S3_ACCESS ]]; then
  RUSTFS_CTR=$(remote_ctr rustfs)
  RUSTFS_IP=$(ssh "$PROD_SSH" "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' $RUSTFS_CTR" | awk '{print $1}')
  log "Tunnel 127.0.0.1:$FWD_PORT -> prod rustfs ($RUSTFS_IP:9000)"
  ssh -o ExitOnForwardFailure=yes -N -L "$FWD_PORT:$RUSTFS_IP:9000" "$PROD_SSH" &
  TUNNEL=$!
  trap 'kill $TUNNEL 2>/dev/null || true' EXIT
  for _ in $(seq 20); do (echo >/dev/tcp/127.0.0.1/$FWD_PORT) 2>/dev/null && break; sleep 0.5; done

  BUCKET=${P_S3_BUCKET:-wedding}
  export MC_HOST_wprod="http://$P_S3_ACCESS:$P_S3_SECRET@127.0.0.1:$FWD_PORT"
  export MC_HOST_wlocal="http://$RUSTFS_ACCESS_KEY:$RUSTFS_SECRET_KEY@127.0.0.1:${RUSTFS_API_PORT:-9000}"
  log "Mirroring bucket '$BUCKET' prod -> local"
  mc mb --ignore-existing "wlocal/$BUCKET"
  mc mirror --overwrite "wprod/$BUCKET" "wlocal/$BUCKET"
fi

log "Done. Next: pnpm db:migrate (applies newer local migrations) && pnpm dev"
