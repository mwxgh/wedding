import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/prisma/client.js';

export * from './generated/prisma/client.js';

/**
 * Build the node-postgres driver adapter from a postgresql:// URL.
 * `?schema=<name>` (as for the Prisma CLI) selects the Postgres schema, so
 * several apps can share one user/database, one schema each.
 */
export function createAdapter(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const schema = url.searchParams.get('schema') ?? undefined;
  url.searchParams.delete('schema');
  return new PrismaPg(
    {
      connectionString: url.toString(),
      max: 5,
      // The adapter assumes the session time zone is UTC; with TZ set on the
      // server (Asia/Ho_Chi_Minh in compose) timestamptz reads and writes
      // shift by the offset
      options: '-c timezone=UTC',
    },
    { schema },
  );
}

export function createPrismaClient(databaseUrl: string) {
  return new PrismaClient({ adapter: createAdapter(databaseUrl) });
}
