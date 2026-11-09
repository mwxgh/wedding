# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f deploy/web.Dockerfile -t wedding-web .

ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@11.25.0
WORKDIR /app

# --- Prune the monorepo down to `web` and its workspace dependencies
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
RUN turbo prune web --docker

# --- Install dependencies, then build
FROM base AS builder
COPY --from=prepare /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY --from=prepare /app/out/full/ .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm turbo run build --filter=web

# --- Runtime (Next.js standalone output)
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
