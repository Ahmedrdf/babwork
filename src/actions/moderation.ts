'use server';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db, jobs, jobReports } from '@/db';
import { getCurrentUser } from '@/lib/auth';

export async function moderateReport(form: FormData) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error('Forbidden');
  const jobId = Number(form.get('jobId'));
  const reporterId = Number(form.get('reporterId'));
  const action = form.get('decision');
  if (!Number.isSafeInteger(jobId) || jobId <= 0 || !Number.isSafeInteger(reporterId) || reporterId <= 0 || !['close', 'deactivate'].includes(String(action))) throw new Error('Invalid request');
  await db.transaction(async tx => {
    const [report] = await tx.select().from(jobReports).where(and(eq(jobReports.jobId, jobId), eq(jobReports.userId, reporterId), eq(jobReports.status, 'open'))).for('update');
    if (!report) return;
    if (action === 'deactivate') {
      await tx.update(jobs).set({ active: false, moderationBlocked: true }).where(eq(jobs.id, jobId));
      await tx.update(jobReports).set({ status: 'removed' }).where(eq(jobReports.jobId, jobId));
    } else await tx.update(jobReports).set({ status: 'closed' }).where(and(eq(jobReports.jobId, jobId), eq(jobReports.userId, reporterId)));
  });
  revalidatePath('/admin/reports'); revalidatePath('/jobs'); revalidatePath(`/jobs/${jobId}`); revalidatePath('/');
}
