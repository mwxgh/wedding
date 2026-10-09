# api

NestJS 12 API (ESM).

```sh
pnpm --filter api dev        # nest start --watch, http://localhost:3001
pnpm --filter api build      # -> dist/
pnpm --filter api start      # node dist/main.js
```

Notes:

- Uses TypeScript `~6.0` (not the root TS 7) because `@nestjs/cli` and `typescript-eslint` require the TS 6 API.
- Generate code with `pnpm --filter api exec nest g resource <name>` (spec files are disabled in `nest-cli.json`).
