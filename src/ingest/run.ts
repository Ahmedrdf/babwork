import sanitizeHtml from 'sanitize-html';
import { and, eq, lt, ne } from 'drizzle-orm';
import { db, jobs, ingestRuns } from '@/db';
import { sources, type RawJob, type Source } from './sources';
import { normalizeCategory } from './categories';

export function sanitize(html: string) {
  return sanitizeHtml(html || '', {
    allowedTags: ['p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'h2', 'h3', 'h4', 'a', 'blockquote'],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noopener', target: '_blank' }) },
  }).trim();
}

export function fingerprint(company: string, title: string) {
  const norm = (s: string) => (s || '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(remote|worldwide|part[- ]time|full[- ]time|contract|m\/f\/d|f\/m\/d|w\/m\/d)\b/g, '')
    .replace(/\s+/g, ' ').trim();
  return `${norm(company)}|${norm(title)}`;
}

export function extractHours(html: string) {
  const text = (html || '').replace(/<[^>]+>/g, ' ');
  const m = text.match(/\b(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s*(?:h|hrs?|hours?)\s*(?:\/|per|a|each)\s*(?:week|wk)\b/i);
  return m ? `${m[2] ? `${m[1]}–${m[2]}` : m[1]} h/week` : '';
}

export async function upsertBatch(raw: RawJob[]) {
  let inserted = 0, updated = 0, skipped = 0;
  for (const r of raw) {
    if (!r.title || !r.company || !r.applyUrl) continue;
    const row = {
      source: r.source, sourceId: r.sourceId, fingerprint: fingerprint(r.company, r.title),
      title: r.title.slice(0, 200), company: r.company.slice(0, 120), companyLogo: r.companyLogo,
      location: (r.location || 'Remote').slice(0, 120), jobType: r.jobType, category: normalizeCategory(r.category, r.title, r.tags).slice(0, 80),
      tags: (r.tags || []).slice(0, 15).map(String), salary: (r.salary || '').slice(0, 120),
      description: sanitize(r.description), hoursPerWeek: extractHours(r.description),
      applyUrl: r.applyUrl, applyEmail: r.applyEmail, publishedAt: r.publishedAt, fetchedAt: new Date(), active: true,
    };
    const [existing] = await db.select({ id: jobs.id }).from(jobs).where(and(eq(jobs.source, row.source), eq(jobs.sourceId, row.sourceId)));
    if (existing) {
      await db.update(jobs).set(row).where(eq(jobs.id, existing.id));
      updated++; continue;
    }
    const [dup] = await db.select({ source: jobs.source }).from(jobs).where(and(eq(jobs.fingerprint, row.fingerprint), eq(jobs.active, true))).limit(1);
    if (dup && dup.source !== row.source) { skipped++; continue; }
    await db.insert(jobs).values(row);
    inserted++;
  }
  return { inserted, updated, skipped };
}

export async function ingestSource(src: Source) {
  const [run] = await db.insert(ingestRuns).values({ source: src.name }).returning({ id: ingestRuns.id });
  try {
    const raw = await src.fetchJobs();
    const r = await upsertBatch(raw);
    await db.update(ingestRuns).set({ finishedAt: new Date(), fetched: raw.length, inserted: r.inserted, updated: r.updated, skippedDuplicates: r.skipped }).where(eq(ingestRuns.id, run.id));
    return { source: src.name, fetched: raw.length, ...r };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(ingestRuns).set({ finishedAt: new Date(), error: message }).where(eq(ingestRuns.id, run.id));
    return { source: src.name, error: message };
  }
}

export async function ingestAll() {
  const results = [];
  for (const s of sources) results.push(await ingestSource(s));
  const cutoff = new Date(Date.now() - 14 * 864e5);
  const expired = await db.update(jobs).set({ active: false })
    .where(and(ne(jobs.source, 'direct'), eq(jobs.active, true), lt(jobs.fetchedAt, cutoff)))
    .returning({ id: jobs.id });
  return { results, expired: expired.length, at: new Date().toISOString() };
}
