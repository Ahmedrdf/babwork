import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, jobs, jobReports, recommendationFeedback } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { env } from '@/lib/env';
import { isBillingOrigin } from '@/lib/premium';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  if (!isBillingOrigin(req.headers.get('origin'), req.url, req.headers.get('host'), env.APP_URL)) return new NextResponse('Forbidden', { status: 403 });
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || !Number.isSafeInteger(body.jobId) || body.jobId <= 0 || !['report', 'feedback'].includes(body.kind)) return new NextResponse('Invalid request', { status: 400 });
  if (body.kind === 'report' && (!['expired', 'misleading', 'suspicious', 'other'].includes(body.reason) || (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 500)))) return new NextResponse('Invalid report', { status: 400 });
  if (body.kind === 'feedback' && typeof body.helpful !== 'boolean') return new NextResponse('Invalid feedback', { status: 400 });
  if (!await rateLimit(`community:${body.kind}:${user.id}`, 40, 3600)) return new NextResponse('Too many requests', { status: 429 });
  const [job] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, body.jobId));
  if (!job) return new NextResponse('Not found', { status: 404 });
  if (body.kind === 'report') await db.insert(jobReports).values({ userId: user.id, jobId: job.id, reason: body.reason, note: body.note?.trim() || '' }).onConflictDoNothing();
  else await db.insert(recommendationFeedback).values({ userId: user.id, jobId: job.id, helpful: body.helpful }).onConflictDoUpdate({ target: [recommendationFeedback.userId, recommendationFeedback.jobId], set: { helpful: body.helpful, updatedAt: new Date() } });
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
}
