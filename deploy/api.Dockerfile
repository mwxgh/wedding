# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f deploy/api.Dockerfile -t wedding-api .

ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@11.25.0
WORKDIR /app

# --- Prune the monorepo down to `api` and its workspace dependencies
FROM base AS prepare
RUN apk add --no-cache curl
# Standalone turbo binary (as in turbo's Docker guide), pinned to the catalog
# version and checksum-verified; only re-downloaded when the catalog changes
COPY pnpm-workspace.yaml /tmp/
RUN set -eu; \
    v=$(sed -n "s/^  'turbo': //p" /tmp/pnpm-workspace.yaml); test -n "$v"; \
    case "$(uname -m)" in \
      x86_64) t=x86_64-unknown-linux-musl ;; \
      aarch64) t=aarch64-unknown-linux-musl ;; \
      *) echo 'Unsupported architecture' >&2; exit 1 ;; \
    esac; \
    a="turbo-$v-$t.tar.gz"; r="https://github.com/vercel/turborepo/releases/download/v$v"; \
    cd /tmp; \
    curl -fsSL "$r/SHA256SUMS" -o SHA256SUMS; \
    curl -fsSL "$r/$a" -o "$a"; \
    awk -v n="$a" '$2 == n && NF == 2 { print }' SHA256SUMS > sum; \
    [ "$(wc -l < sum)" -eq 1 ]; sha256sum -c sum; \
    [ "$(tar -tzf "$a")" = turbo ]; \
    tar -xzf "$a" -C /usr/local/bin turbo; chmod 755 /usr/local/bin/turbo; \
    rm SHA256SUMS sum "$a" pnpm-workspace.yaml
COPY . .
RUN turbo prune api --docker

# --- Install dependencies, then build
FROM base AS builder
COPY --from=prepare /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY --from=prepare /app/out/full/ .
RUN pnpm turbo run build --filter=api
# Isolated production node_modules for `api`
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm --filter=api deploy --prod --legacy /prod/api

# --- One-off database migrations (`--target migrate`): only the Prisma CLI,
# schema and migrations. Built from `builder` it carried the whole workspace
# install and filled the small VPS disk on pull
FROM node:${NODE_VERSION} AS migrate
WORKDIR /app
COPY pnpm-workspace.yaml /tmp/
# Same versions as the catalog
RUN PRISMA=$(sed -n "s/^  'prisma': //p" /tmp/pnpm-workspace.yaml) \
 && DOTENV=$(sed -n "s/^  'dotenv': //p" /tmp/pnpm-workspace.yaml) \
 && test -n "$PRISMA" && test -n "$DOTENV" \
 && echo '{"private":true,"type":"module"}' > package.json \
 && npm install --omit=dev --no-audit --no-fund "prisma@$PRISMA" "dotenv@$DOTENV" \
 && npm cache clean --force && rm /tmp/pnpm-workspace.yaml
COPY packages/db/prisma.config.ts ./
COPY packages/db/prisma/schema.prisma ./prisma/
COPY packages/db/prisma/migrations ./prisma/migrations
CMD ["node_modules/.bin/prisma", "migrate", "deploy"]

# --- Runtime (default target, keep it last)
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder --chown=node:node /prod/api/package.json ./package.json
COPY --from=builder --chown=node:node /prod/api/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/apps/api/dist ./dist

USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
