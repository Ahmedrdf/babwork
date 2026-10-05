// One-off: map every existing job onto the clean category list. Usage: npm run recategorize
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, jobs } from '../src/db';
import { normalizeCategory } from '../src/ingest/categories';

(async () => {
  const rows = await db.select({ id: jobs.id, category: jobs.category, title: jobs.title, tags: jobs.tags }).from(jobs);
  let changed = 0;
  for (const r of rows) {
    const c = normalizeCategory(r.category, r.title, r.tags);
    if (c !== r.category) { await db.update(jobs).set({ category: c }).where(eq(jobs.id, r.id)); changed++; }
  }
  console.log(`Recategorized ${changed} of ${rows.length} jobs`);
  process.exit(0);
})();
