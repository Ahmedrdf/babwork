import * as schema from './schema';
import { lockPglite } from './pglite-lock';

/**
 * Database client.
 * - Production / normal dev: DATABASE_URL=postgresql://… (Neon, Supabase, local Postgres)
 * - Zero-setup dev: DATABASE_URL=pglite://./.pglite  (embedded Postgres, no server needed)
 */
type Db = import('drizzle-orm/node-postgres').NodePgDatabase<typeof schema>;

// Next.js can evaluate separate route bundles in separate globals. The Node process
// object shares the client across those contexts as well as development reloads.
const g = process as typeof process & { __babworkDb?: Db; __babworkCloseDb?: () => Promise<void> };

function create(): Db {
  const url = process.env.DATABASE_URL || '';
  if (url.startsWith('pglite://')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PGlite } = require('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require('drizzle-orm/pglite') as typeof import('drizzle-orm/pglite');
    const dataDir = url.replace('pglite://', '');
    const release = lockPglite(dataDir);
    let client: InstanceType<typeof PGlite>;
    try { client = new PGlite(dataDir); }
    catch (error) { release(); throw error; }
    let closing: Promise<void> | undefined;
    const close = () => closing ??= client.close().finally(release);
    g.__babworkCloseDb = close;
    process.once('beforeExit', async () => {
      try { await close(); }
      finally { release(); }
    });
    process.once('exit', release);
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
  g.__babworkCloseDb = () => pool.end();
  return drizzle(pool, { schema });
}

// Always share one client per process: Next.js bundles routes separately, and each bundle
// would otherwise open its own pool (or, with PGlite, its own database instance).
// Importing a route during a production build must not open the local database.
// Create the shared client only when code actually runs a query.
export const db: Db = new Proxy({} as Db, {
  get(_target, property) {
    const client = g.__babworkDb ?? (g.__babworkDb = create());
    const value = Reflect.get(client, property);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

/** CLI scripts must flush the embedded database before ending the process. */
export async function closeDb() {
  await g.__babworkCloseDb?.();
  delete g.__babworkDb;
  delete g.__babworkCloseDb;
}

export * from './schema';
