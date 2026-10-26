// Apply SQL migrations in ./drizzle to DATABASE_URL (Postgres or pglite://). Usage: npm run db:migrate
import 'dotenv/config';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { sql } from 'drizzle-orm';
import { db, closeDb } from '../src/db';

async function main() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const done = new Set((await db.execute(sql`SELECT name FROM _migrations`)).rows.map((r) => String((r as { name: string }).name)));
  const files = readdirSync(join(process.cwd(), 'drizzle')).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    const statements = readFileSync(join(process.cwd(), 'drizzle', f), 'utf8').split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean);
    await db.transaction(async tx => {
      for (const st of statements) await tx.execute(sql.raw(st));
      await tx.execute(sql`INSERT INTO _migrations (name) VALUES (${f})`);
    });
    console.log('applied', f);
  }
  console.log(done.size === files.length ? 'database already up to date' : 'migrations complete');
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(closeDb);
