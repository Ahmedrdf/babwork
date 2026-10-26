import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { db, applications, savedJobs, profiles, type Job } from '@/db';
import { getJob, similarJobs, viewedIds } from '@/lib/jobs';
import { getCurrentUser } from '@/lib/auth';
import { getVisitor } from '@/lib/visitor';
import { isOpenTo } from '@/lib/regions';
import { toggleSaved } from '@/actions/account';
import { JobCard, hoursLabel } from '@/components/JobCard';
import { TrackView } from '@/components/TrackView';
import { plainText } from '@/lib/text';
import { getLocale } from '@/i18n/server';
import { messages } from '@/i18n/messages';
import { INTL } from '@/i18n/config';
import { ApplyBox } from './ApplyBox';
import { JobReport } from '@/components/Community';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [job, locale] = await Promise.all([params.then((p) => getJob(Number(p.id))), getLocale()]);
  if (!job) return { title: messages[locale].meta.jobNotFound, robots: { index: false } };
  const title = `${job.title} — ${job.company}`;
  const description = plainText(`${job.company} · ${job.location}${job.salary ? ` · ${job.salary}` : ''} — ${job.description}`, 200);
  return {
    title,
    description,
    alternates: { canonical: `/jobs/${job.id}` },
    robots: job.active ? undefined : { index: false, follow: true },
    openGraph: { title, description, type: 'website', url: `/jobs/${job.id}`, images: job.companyLogo ? [{ url: job.companyLogo }] : undefined },
    twitter: { card: 'summary', title, description },
  };
}

const EMPLOYMENT_TYPE: Record<string, string> = { full_time: 'FULL_TIME', part_time: 'PART_TIME', contract: 'CONTRACTOR', freelance: 'CONTRACTOR', internship: 'INTERN', other: 'OTHER' };

// Structured data so search engines can show the job in job search results.
function jobPostingJsonLd(job: Job) {
  const anywhere = /worldwide|anywhere|global|^remote$/i.test(job.location.trim());
  const areas = anywhere ? [] : job.location.split(/[,/;|]+/).map((s) => s.trim()).filter(Boolean);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description || job.title,
    datePosted: job.publishedAt.toISOString(),
    validThrough: new Date(job.fetchedAt.getTime() + 30 * 864e5).toISOString(),
    employmentType: EMPLOYMENT_TYPE[job.jobType] || 'OTHER',
    hiringOrganization: { '@type': 'Organization', name: job.company, ...(job.companyLogo ? { logo: job.companyLogo } : {}) },
    jobLocationType: 'TELECOMMUTE',
    ...(areas.length ? { applicantLocationRequirements: areas.map((name) => ({ '@type': 'Country', name })) } : {}),
    directApply: !!job.applyEmail,
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default async function JobPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [user, job, visitor, locale] = await Promise.all([getCurrentUser(), getJob(id), getVisitor(), getLocale()]);
  if (!job) notFound();
  const t = messages[locale];

  const [mine, similar] = await Promise.all([
    user
      ? Promise.all([
          db.select().from(applications).where(and(eq(applications.userId, user.id), eq(applications.jobId, id))),
          db.select().from(savedJobs).where(and(eq(savedJobs.userId, user.id), eq(savedJobs.jobId, id))),
          db.select().from(profiles).where(eq(profiles.userId, user.id)),
        ])
      : Promise.resolve(null),
    similarJobs(job, 6),
  ]);
  const application = mine?.[0][0] ?? null;
  const saved = !!mine?.[1][0];
  const profile = mine?.[2][0] ?? null;
  const seen = await viewedIds(user?.id, similar.map((s) => s.id));
  const toggle = toggleSaved.bind(null, id);
  const initials = job.company.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const fmt = new Intl.DateTimeFormat(INTL[locale], { day: 'numeric', month: 'long', year: 'numeric' });
  const open = visitor.region ? isOpenTo(job.location, visitor.region) : null;
  const catName = t.categories[job.category] ?? job.category;

  return (
    <article className="job">
      {job.active && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jobPostingJsonLd(job) }} />}
      {user && <TrackView jobId={job.id} />}
      <Link className="back" href="/jobs">{t.job.back}</Link>
      <header className="job-head job-head-band">
        <div className="card-logo card-logo-lg" aria-hidden="true">
          {job.companyLogo ? <img src={job.companyLogo} alt="" loading="lazy" /> : <span>{initials}</span>}
        </div>
        <div>
          <p className="job-co" dir="auto">{job.company}</p>
          <h1 dir="auto">{job.title}</h1>
          {job.salary ? <p className="job-salary" dir="auto">{job.salary}</p> : null}
          <div className="card-facts job-facts-lg">
            <span className="fact">{t.types[job.jobType] ?? job.jobType}</span>
            {job.hoursPerWeek ? <span className="fact">{hoursLabel(job.hoursPerWeek, locale)}</span> : null}
            <span className="fact" dir="auto">{job.location}</span>
            {open && visitor.region ? <span className="fact fact-open">{t.openTo(t.regions[visitor.region].to)}</span> : null}
            {job.applyEmail ? <span className="fact fact-direct">{t.card.direct}</span> : null}
          </div>
          {open === false && visitor.region ? <p className="eligibility">{t.job.eligibility(job.location, t.regions[visitor.region].to)}</p> : null}
          <p className="quiet job-meta">{t.job.posted(fmt.format(job.publishedAt))}</p>
        </div>
      </header>

      {!job.active && <p className="warn">{t.job.closed}</p>}

      <div className="job-grid">
        <div className="job-body">
          {job.tags.length > 0 && <p className="tags" dir="auto">{job.tags.map((x) => <span key={x}>{x}</span>)}</p>}
          <div className="desc" dir="auto" dangerouslySetInnerHTML={{ __html: job.description || `<p>${t.job.noDescription}</p>` }} />
        </div>
        <aside className="apply-box" id="apply">
          <ApplyBox
            job={{ id: job.id, company: job.company, applyUrl: job.applyUrl, applyEmail: job.applyEmail, active: job.active }}
            user={user ? { email: user.email, emailVerified: !!user.emailVerifiedAt } : null}
            profile={profile ? { fullName: profile.fullName, phone: profile.phone, linkedinUrl: profile.linkedinUrl, portfolioUrl: profile.portfolioUrl, coverNote: profile.coverNote, hasCv: !!profile.cvKey, cvName: profile.cvOriginalName } : null}
            application={application ? { createdAt: application.createdAt.toISOString(), method: application.method } : null}
          />
          {user
            ? <form action={toggle} className="save"><button className="linkish">{saved ? t.job.unsave : t.job.save}</button></form>
            : <p className="save"><Link href={`/login?next=/jobs/${id}`}>{t.job.signInToSave}</Link></p>}
          <JobReport jobId={id} signedIn={!!user} />
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="similar">
          <div className="section-head">
            <h2>{t.job.similar}</h2>
            {job.category && job.category !== 'Other' ? <Link className="more" href={`/jobs?category=${encodeURIComponent(job.category)}`}>{t.job.allIn(catName)}</Link> : null}
          </div>
          <ul className="cards">{similar.map((s) => <JobCard key={s.id} j={s} locale={locale} seen={seen.has(s.id)} openRegion={visitor.region} />)}</ul>
        </section>
      )}

      {job.active && !application && (
        <div className="mobile-cta">
          <span dir="auto">{job.company}</span>
          <a className="btn" href="#apply">{t.job.apply}</a>
        </div>
      )}
    </article>
  );
}
