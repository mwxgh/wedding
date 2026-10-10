import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from './generated/prisma/client.js';

export * from './generated/prisma/client.js';

/** Build the MariaDB driver adapter (works with MySQL 8) from a mysql:// URL. */
export function createAdapter(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    connectionLimit: 5,
    // MySQL 8 uses caching_sha2_password
    allowPublicKeyRetrieval: true,
  });
}

export function createPrismaClient(databaseUrl: string) {
  return new PrismaClient({ adapter: createAdapter(databaseUrl) });
}
