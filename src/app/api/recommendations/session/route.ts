import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db, jobs } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { isRegion, regionCondition } from '@/lib/jobs';
import { TUNISIA_LOCATION_PATTERN } from '@/lib/tunisia';
import { matchingAccess, startMatchingTrial, finishMatchingTrial } from '@/lib/matching-access';
import { isBillingOrigin } from '@/lib/premium';
import { env } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { plainText } from '@/lib/text';

export async function POST(req: NextRequest) {
  if (!isBillingOrigin(req.headers.get('origin'), req.url, req.headers.get('host'), env.APP_URL)) return new NextResponse('Forbidden', { status: 403 });
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });
  if (!await rateLimit(`matching-session:${user.id}`, 60, 3600)) return new NextResponse('Too many requests', { status: 429 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return new NextResponse('Invalid request', { status: 400 });
  if (body.complete !== undefined) {
    if (typeof body.complete !== 'string' || body.complete.length !== 36) return new NextResponse('Invalid permit', { status: 400 });
    return NextResponse.json({ ok: await finishMatchingTrial(user.id, body.complete) }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const access = await matchingAccess(user);
  if (access === 'locked') return new NextResponse('Premium required', { status: 403 });
  const region = body.region;
  if (region && !isRegion(region) && region !== 'TN') return new NextResponse('Invalid region', { status: 400 });
  const rows = await db.select({ id: jobs.id, title: jobs.title, company: jobs.company, location: jobs.location,
    category: jobs.category, tags: jobs.tags, description: jobs.description, salary: jobs.salary }).from(jobs)
    .where(and(eq(jobs.active, true), region === 'TN' ? sql`${jobs.location} ~* ${TUNISIA_LOCATION_PATTERN}` : isRegion(region) ? regionCondition(region) : undefined))
    .orderBy(desc(jobs.publishedAt), desc(jobs.id)).limit(300);
  const permit = access === 'trial' && rows.length ? await startMatchingTrial(user.id) : null;
  if (access === 'trial' && rows.length && !permit) return new NextResponse('Premium required', { status: 403 });
  return NextResponse.json({ permit, jobs: rows.map(job => ({ ...job, description: plainText(job.description, 3000) })) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
