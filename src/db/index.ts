import * as schema from './schema';

/**
 * Database client.
 * - Production / normal dev: DATABASE_URL=postgresql://… (Neon, Supabase, local Postgres)
 * - Zero-setup dev: DATABASE_URL=pglite://./.pglite  (embedded Postgres, no server needed)
 */
type Db = import('drizzle-orm/node-postgres').NodePgDatabase<typeof schema>;

const g = globalThis as unknown as { __db?: Db };

function create(): Db {
  const url = process.env.DATABASE_URL || '';
  if (url.startsWith('pglite://')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PGlite } = require('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require('drizzle-orm/pglite') as typeof import('drizzle-orm/pglite');
    const client = new PGlite(url.replace('pglite://', ''));
    return drizzle(client, { schema }) as unknown as Db;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require('pg') as typeof import('pg');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require('drizzle-orm/node-postgres') as typeof import('drizzle-orm/node-postgres');
  const pool = new Pool({
    connectionString: url,
    max: 5,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
  });
  return drizzle(pool, { schema });
}

// Always share one client per process: Next.js bundles routes separately, and each bundle
// would otherwise open its own pool (or, with PGlite, its own database instance).
export const db: Db = g.__db ?? (g.__db = create());

export * from './schema';
