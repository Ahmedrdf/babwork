import { NextResponse, type NextRequest } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db, jobs } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { isRegion, regionCondition } from '@/lib/jobs';
import { plainText } from '@/lib/text';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });
  if (!env.freeLaunchEnabled && !user.isPro && !env.cvMatchingPreviewEnabled) return new NextResponse('Premium required', { status: 403 });
  const region = req.nextUrl.searchParams.get('region');
  if (region && !isRegion(region)) return new NextResponse('Invalid region', { status: 400 });
  const rows = await db.select({
    id: jobs.id, title: jobs.title, company: jobs.company, location: jobs.location,
    category: jobs.category, tags: jobs.tags, description: jobs.description, salary: jobs.salary,
  }).from(jobs).where(and(eq(jobs.active, true), isRegion(region) ? regionCondition(region) : undefined))
    .orderBy(desc(jobs.publishedAt), desc(jobs.id)).limit(300);
  return NextResponse.json({ jobs: rows.map(job => ({ ...job, description: plainText(job.description, 3000) })) },
    { headers: { 'Cache-Control': 'private, no-store' } });
}
