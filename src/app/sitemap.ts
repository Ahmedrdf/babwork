import type { MetadataRoute } from 'next';
import { desc, eq } from 'drizzle-orm';
import { db, jobs } from '@/db';
import { topCategories } from '@/lib/jobs';

// Built on each request: job listings change every few hours.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || 'http://localhost:3000';
  const [rows, categories] = await Promise.all([
    db.select({ id: jobs.id, fetchedAt: jobs.fetchedAt }).from(jobs).where(eq(jobs.active, true)).orderBy(desc(jobs.publishedAt)).limit(5000),
    topCategories(50),
  ]);
  return [
    { url: `${base}/`, changeFrequency: 'hourly', priority: 1 },
    { url: `${base}/jobs`, changeFrequency: 'hourly', priority: 0.9 },
    ...categories.map((c) => ({ url: `${base}/jobs?category=${encodeURIComponent(c.category)}`, changeFrequency: 'daily' as const, priority: 0.7 })),
    ...rows.map((r) => ({ url: `${base}/jobs/${r.id}`, lastModified: r.fetchedAt, changeFrequency: 'daily' as const, priority: 0.6 })),
  ];
}
