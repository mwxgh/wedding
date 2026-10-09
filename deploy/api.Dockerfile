# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f deploy/api.Dockerfile -t wedding-api .

ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@11.25.0
WORKDIR /app

# --- Prune the monorepo down to `api` and its workspace dependencies
FROM base AS prepare
RUN npm install -g turbo@2.11.7
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

# --- Runtime
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
