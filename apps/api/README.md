# api

NestJS 12 API (ESM).

```sh
pnpm --filter api dev        # nest start --watch, http://localhost:3001
pnpm --filter api build      # -> dist/
pnpm --filter api start      # node dist/main.js
```

Notes:

- TypeScript comes from the `catalog:` in `pnpm-workspace.yaml` (TS 6: `@nestjs/cli` and `typescript-eslint` need its compiler API).
- Prisma: `PrismaModule` / `PrismaService` / `PrismaExceptionFilter` come from `@repo/db/nest`; query shapes (`include`/`select`) live in `src/common/responses.ts`.
- Generate code with `pnpm --filter api exec nest g resource <name>` (spec files are disabled in `nest-cli.json`).
