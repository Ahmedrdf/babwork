import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db, applications, jobs, savedJobs } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { cardColumns } from '@/lib/jobs';
import { getVisitor } from '@/lib/visitor';
import { JobCard } from '@/components/JobCard';
import { getLocale } from '@/i18n/server';
import { messages } from '@/i18n/messages';
import { INTL } from '@/i18n/config';
import { StatusSelect } from './StatusSelect';
export async function generateMetadata() { return { title: messages[await getLocale()].meta.applications }; }

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/applications');
  const [apps, saved, locale, visitor] = await Promise.all([
    db.select({ a: applications, title: jobs.title, company: jobs.company, location: jobs.location, applyUrl: jobs.applyUrl })
      .from(applications).innerJoin(jobs, eq(jobs.id, applications.jobId))
      .where(eq(applications.userId, user.id)).orderBy(desc(applications.createdAt)),
    db.select(cardColumns).from(savedJobs).innerJoin(jobs, eq(jobs.id, savedJobs.jobId)).where(eq(savedJobs.userId, user.id)).orderBy(desc(savedJobs.createdAt)),
    getLocale(), getVisitor(),
  ]);
  const t = messages[locale].apps;

  return (
    <section className="form-page wide">
      <h1>{t.title}</h1>
      {apps.length === 0 ? <p className="empty">{t.empty[0]}<Link href="/jobs">{t.empty[1]}</Link>{t.empty[2]}</p> : (
        <table className="apps">
          <thead><tr><th>{t.job}</th><th>{t.applied}</th><th>{t.how}</th><th>{t.status}</th></tr></thead>
          <tbody>
            {apps.map(({ a, title, company, location }) => (
              <tr key={a.id}>
                <td><Link href={`/jobs/${a.jobId}`} dir="auto">{title}</Link><br /><small dir="auto">{company} — {location}</small></td>
                <td>{a.createdAt.toLocaleDateString(INTL[locale])}</td>
                <td>{a.method === 'email' ? t.email : t.site}</td>
                <td><StatusSelect id={a.id} status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2 className="section-h">{t.saved}</h2>
      {saved.length === 0 ? <p className="empty">{t.savedEmpty}</p>
        : <ul className="cards">{saved.map((j) => <JobCard key={j.id} j={j} locale={locale} openRegion={visitor.region} />)}</ul>}
    </section>
  );
}
