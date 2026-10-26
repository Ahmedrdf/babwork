import 'server-only';
import { cache } from 'react';
import { and, desc, eq, sql, isNotNull, count, ne, inArray, type SQL } from 'drizzle-orm';
import { db, jobs, jobViews, type Job } from '@/db';
import { isRegion, sqlPattern, SQL_ANYWHERE, type RegionKey } from './regions';
import { TUNISIA_LOCATION_PATTERN } from './tunisia';

export const PAGE_SIZE = 24;
export const JOB_TYPES = ['part_time', 'full_time', 'contract', 'freelance', 'internship'] as const;
export type JobType = (typeof JOB_TYPES)[number];

export type JobFilters = { q?: string; type?: string; category?: string; region?: string; country?: string; direct?: boolean; salary?: boolean; hours?: boolean; page?: number };

export { REGIONS, REGION_KEYS, isRegion, type RegionKey } from './regions';

export function regionCondition(key: RegionKey) {
  return sql`(${jobs.location} ~* ${sqlPattern(key)} or ${jobs.location} ~* ${SQL_ANYWHERE} or lower(trim(${jobs.location})) in ('remote', ''))`;
}

const searchVector = sql`to_tsvector('english', coalesce(${jobs.title}, '') || ' ' || coalesce(${jobs.company}, '') || ' ' || coalesce(${jobs.category}, '') || ' ' || coalesce(${jobs.description}, ''))`;

/** Everything a job card needs, including a plain-text excerpt of the description. */
export const cardColumns = {
  id: jobs.id, title: jobs.title, company: jobs.company, companyLogo: jobs.companyLogo, location: jobs.location,
  jobType: jobs.jobType, category: jobs.category, salary: jobs.salary, hoursPerWeek: jobs.hoursPerWeek,
  publishedAt: jobs.publishedAt, tags: jobs.tags,
  directApply: sql<boolean>`${jobs.applyEmail} is not null`,
  excerpt: sql<string>`left(regexp_replace(regexp_replace(${jobs.description}, '<[^>]+>', ' ', 'g'), '\\s+', ' ', 'g'), 260)`,
};

export async function listJobs(f: JobFilters) {
  const page = Math.max(1, f.page || 1);
  const where: SQL[] = [eq(jobs.active, true)];
  if (f.type && (JOB_TYPES as readonly string[]).includes(f.type)) where.push(eq(jobs.jobType, f.type as JobType));
  if (f.category) where.push(eq(jobs.category, f.category));
  if (isRegion(f.region)) where.push(regionCondition(f.region));
  if (f.country === 'TN') where.push(sql`${jobs.location} ~* ${TUNISIA_LOCATION_PATTERN}`);
  if (f.direct) where.push(isNotNull(jobs.applyEmail));
  if (f.salary) where.push(sql`${jobs.salary} <> ''`);
  if (f.hours) where.push(sql`${jobs.hoursPerWeek} <> ''`);
  let rank: SQL | null = null;
  if (f.q?.trim()) {
    const query = sql`websearch_to_tsquery('english', ${f.q.trim()})`;
    where.push(sql`${searchVector} @@ ${query}`);
    rank = sql`ts_rank(${searchVector}, ${query})`;
  }
  const cond = and(...where);
  const [{ total }] = await db.select({ total: count() }).from(jobs).where(cond);
  const rows = await db.select(cardColumns).from(jobs).where(cond)
    .orderBy(...(rank ? [desc(rank), desc(jobs.publishedAt)] : [desc(jobs.publishedAt)]))
    .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
  return { jobs: rows, total: Number(total), page, pages: Math.ceil(Number(total) / PAGE_SIZE) };
}

export type JobRow = Awaited<ReturnType<typeof listJobs>>['jobs'][number];

/** Jobs that share tags, category or contract type with this one, best matches first. */
export async function similarJobs(job: Job, limit = 6) {
  const tags = (job.tags || []).map((t) => String(t).toLowerCase()).filter(Boolean).slice(0, 12);
  const tagArray = tags.length ? sql`array[${sql.join(tags.map((t) => sql`${t}`), sql`, `)}]::text[]` : sql`array[]::text[]`;
  const overlap = sql`(select count(*) from jsonb_array_elements_text(${jobs.tags}) as t(v) where lower(t.v) = any(${tagArray}))`;
  const score = sql`(${overlap} + case when ${jobs.category} = ${job.category} and ${jobs.category} <> 'Other' then 3 else 0 end + case when ${jobs.jobType} = ${job.jobType} then 1 else 0 end)`;
  return db.select(cardColumns).from(jobs)
    .where(and(eq(jobs.active, true), ne(jobs.id, job.id), sql`${score} > 0`))
    .orderBy(desc(score), desc(jobs.publishedAt)).limit(limit);
}

/** Which of these jobs the user has already opened. */
export async function viewedIds(userId: number | undefined, ids: number[]) {
  if (!userId || ids.length === 0) return new Set<number>();
  const rows = await db.select({ jobId: jobViews.jobId }).from(jobViews)
    .where(and(eq(jobViews.userId, userId), inArray(jobViews.jobId, ids)));
  return new Set(rows.map((r) => r.jobId));
}

export async function topCategories(limit = 14) {
  return db.select({ category: jobs.category, n: count() }).from(jobs)
    .where(and(eq(jobs.active, true), sql`${jobs.category} not in ('', 'Other')`))
    .groupBy(jobs.category).orderBy(desc(count())).limit(limit);
}

/** How many active jobs each region can apply to. */
export async function regionCounts(): Promise<Record<RegionKey, number>> {
  const [r] = await db.select({
    europe: sql<number>`count(*) filter (where ${regionCondition('europe')})`,
    americas: sql<number>`count(*) filter (where ${regionCondition('americas')})`,
    mea: sql<number>`count(*) filter (where ${regionCondition('mea')})`,
    apac: sql<number>`count(*) filter (where ${regionCondition('apac')})`,
  }).from(jobs).where(eq(jobs.active, true));
  return { europe: Number(r.europe), americas: Number(r.americas), mea: Number(r.mea), apac: Number(r.apac) };
}

export async function featuredCompanies(limit = 8) {
  return db.select({ company: jobs.company, logo: jobs.companyLogo, n: count() }).from(jobs)
    .where(and(eq(jobs.active, true), isNotNull(jobs.companyLogo)))
    .groupBy(jobs.company, jobs.companyLogo).orderBy(desc(count())).limit(limit);
}

export async function homeStats() {
  const [s] = await db.select({
    total: count(),
    partTime: sql<number>`count(*) filter (where ${jobs.jobType} = 'part_time')`,
    direct: sql<number>`count(*) filter (where ${jobs.applyEmail} is not null)`,
    fresh: sql<number>`count(*) filter (where ${jobs.publishedAt} > now() - interval '24 hours')`,
    sources: sql<number>`count(distinct ${jobs.source})`,
  }).from(jobs).where(eq(jobs.active, true));
  return { total: Number(s.total), partTime: Number(s.partTime), direct: Number(s.direct), fresh: Number(s.fresh), sources: Number(s.sources) };
}

export const getJob = cache(async (id: number) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
  return job ?? null;
});
