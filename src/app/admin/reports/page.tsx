import Link from 'next/link';
import { notFound } from 'next/navigation';
import { count, desc, eq } from 'drizzle-orm';
import { db, jobs, jobReports, recommendationFeedback } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { getLocale } from '@/i18n/server';
import { improvements } from '@/i18n/improvements';
import { moderateReport } from '@/actions/moderation';

export const metadata = { robots: { index: false, follow: false } };
export default async function Reports() {
  if (!(await getCurrentUser())?.isAdmin) notFound();
  const t = improvements[await getLocale()];
  const [reports, feedback] = await Promise.all([
    db.select({ report: jobReports, title: jobs.title }).from(jobReports).innerJoin(jobs, eq(jobs.id, jobReports.jobId)).where(eq(jobReports.status, 'open')).orderBy(desc(jobReports.createdAt)).limit(100),
    db.select({ helpful: recommendationFeedback.helpful, total: count() }).from(recommendationFeedback).groupBy(recommendationFeedback.helpful),
  ]);
  return <section className="premium-page"><h1>{t.moderation}</h1><h2>{t.feedbackTitle}</h2><p>{feedback.map(row => `${row.helpful ? t.helpful : t.unhelpful}: ${row.total}`).join(' · ') || '0'}</p>
    {!reports.length && <p>{t.noReports}</p>}<div className="about-grid">{reports.map(({ report, title }) => <article className="plan-card" key={`${report.userId}-${report.jobId}`}>
      <h2><Link href={`/jobs/${report.jobId}`}>{title}</Link></h2><p>{t[report.reason as 'expired' | 'misleading' | 'suspicious' | 'other'] ?? t.other}</p><p dir="auto">{report.note}</p>
      <form action={moderateReport} className="matching-actions"><input type="hidden" name="jobId" value={report.jobId} /><input type="hidden" name="reporterId" value={report.userId} />
        <button name="decision" value="close" className="btn ghost">{t.close}</button><button name="decision" value="deactivate" className="btn">{t.deactivate}</button></form>
    </article>)}</div></section>;
}
