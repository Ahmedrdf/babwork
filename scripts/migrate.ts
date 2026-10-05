// Apply SQL migrations in ./drizzle to DATABASE_URL (Postgres or pglite://). Usage: npm run db:migrate
import 'dotenv/config';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { sql } from 'drizzle-orm';
import { db } from '../src/db';

async function main() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const done = new Set((await db.execute(sql`SELECT name FROM _migrations`)).rows.map((r) => String((r as { name: string }).name)));
  const files = readdirSync(join(process.cwd(), 'drizzle')).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    const statements = readFileSync(join(process.cwd(), 'drizzle', f), 'utf8').split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean);
    for (const st of statements) await db.execute(sql.raw(st));
    await db.execute(sql`INSERT INTO _migrations (name) VALUES (${f})`);
    console.log('applied', f);
  }
  console.log(done.size === files.length ? 'database already up to date' : 'migrations complete');
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
