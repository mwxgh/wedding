# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f deploy/web.Dockerfile -t wedding-web .

ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@11.25.0
WORKDIR /app

# --- Prune the monorepo down to `web` and its workspace dependencies
FROM base AS prepare
RUN npm install -g turbo@2.11.7
COPY . .
RUN turbo prune web --docker

# --- Install dependencies, then build
FROM base AS builder
COPY --from=prepare /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY --from=prepare /app/out/full/ .
ENV NEXT_TELEMETRY_DISABLED=1
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
