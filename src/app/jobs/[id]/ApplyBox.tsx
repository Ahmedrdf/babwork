'use client';
import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';
import { apply, logRedirectApplication } from '@/actions/account';
import { Flash } from '@/components/Flash';
import { SubmitButton } from '@/components/SubmitButton';
import { useLocale, useT } from '@/i18n/client';
import { INTL } from '@/i18n/config';

type Props = {
  job: { id: number; company: string; applyUrl: string; applyEmail: string | null; active: boolean };
  user: { email: string; emailVerified: boolean } | null;
  profile: { fullName: string; phone: string; linkedinUrl: string; portfolioUrl: string; coverNote: string; hasCv: boolean; cvName: string | null } | null;
  application: { createdAt: string; method: 'redirect' | 'email' } | null;
};

export function ApplyBox({ job, user, profile, application }: Props) {
  const t = useT();
  const locale = useLocale();
  const a = t.apply;
  const [state, action] = useActionState(apply, undefined);
  const [openedEmployer, setOpenedEmployer] = useState(false);
  const [, start] = useTransition();

  if (!job.active) return (<><h2>{a.closedTitle}</h2><p>{a.closedText}</p></>);

  // Already applied (earlier, or just now in this tab)
  if (application || state?.ok || openedEmployer) {
    const byEmail = !!state?.ok || (!openedEmployer && application?.method === 'email');
    const when = application && !state?.ok && !openedEmployer ? a.onDate(new Date(application.createdAt).toLocaleDateString(INTL[locale])) : a.justNow;
    return (
      <>
        <p className="done">{byEmail ? a.appliedEmail(when) : a.appliedSite(when)}</p>
        <a className="btn ghost" href={job.applyUrl} target="_blank" rel="noopener nofollow">{a.openOriginal}</a>
        <Link className="quiet-link" href="/applications">{a.goTracker}</Link>
      </>
    );
  }

  // Visitor without an account: the page is public, applying with a profile needs a free account
  if (!user) {
    return (
      <>
        <h2>{a.anonTitle}</h2>
        <p>{a.anonText}</p>
        <Link className="btn" href={`/register?next=/jobs/${job.id}`}>{a.createAccount}</Link>
        <Link className="quiet-link" href={`/login?next=/jobs/${job.id}`}>{a.haveAccount}</Link>
        <a className="quiet-link" href={job.applyUrl} target="_blank" rel="noopener nofollow">{a.orDirect}</a>
      </>
    );
  }

  // Opens the employer's form in a new tab (so Babwork stays open) and logs it in the tracker
  const openEmployer = () => start(async () => { await logRedirectApplication(job.id); setOpenedEmployer(true); });
  const missingProfile = !profile?.fullName || !profile?.hasCv;
  const emailBlock = !job.applyEmail ? null : missingProfile ? 'profile' : !user.emailVerified ? 'verify' : null;

  return (
    <>
      <h2>{profile?.fullName ? a.titleAs(profile.fullName) : a.title}</h2>
      <Flash state={state} />
      {job.applyEmail ? (
        <form action={action}>
          <input type="hidden" name="jobId" value={job.id} />
          <label>{a.coverNote}
            <textarea name="coverNote" rows={6} dir="auto" defaultValue={profile?.coverNote} placeholder={a.coverPlaceholder} />
          </label>
          {emailBlock === 'profile' && <p className="warn">{a.needProfile[0]}<Link href={`/profile?next=/jobs/${job.id}`}>{a.needProfile[1]}</Link>{a.needProfile[2]}</p>}
          {emailBlock === 'verify' && <p className="warn">{a.needVerify}</p>}
          <SubmitButton name="method" value="email" pendingText={a.sending} disabled={!!emailBlock}>{a.emailButton(job.company)}</SubmitButton>
          <a className="btn ghost" href={job.applyUrl} target="_blank" rel="noopener nofollow" onClick={openEmployer}>{a.siteInstead}</a>
          <p className="hint">{a.emailHint(job.applyEmail)}</p>
        </form>
      ) : (
        <>
          <a className="btn" href={job.applyUrl} target="_blank" rel="noopener nofollow" onClick={openEmployer}>{a.siteButton(job.company)}</a>
          <p className="hint">{a.siteHint}{profile?.fullName ? a.siteHintDetails : ''}</p>
        </>
      )}
      {profile?.fullName ? (
        <details className="profile-peek">
          <summary>{a.details}</summary>
          <dl>
            <dt>{a.name}</dt><dd dir="auto">{profile.fullName}</dd>
            <dt>{a.email}</dt><dd dir="ltr">{user.email}</dd>
            {profile.phone && <><dt>{a.phone}</dt><dd dir="ltr">{profile.phone}</dd></>}
            {profile.linkedinUrl && <><dt>{a.linkedin}</dt><dd dir="ltr">{profile.linkedinUrl}</dd></>}
            {profile.portfolioUrl && <><dt>{a.portfolio}</dt><dd dir="ltr">{profile.portfolioUrl}</dd></>}
            {profile.hasCv && <><dt>{a.cv}</dt><dd dir="auto"><a href="/api/profile/cv">{profile.cvName}</a></dd></>}
          </dl>
        </details>
      ) : null}
    </>
  );
}
