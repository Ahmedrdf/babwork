'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { saveProfile, deleteAccount } from '@/actions/account';
import type { FormState } from '@/actions/auth';
import { Flash } from '@/components/Flash';
import { SubmitButton } from '@/components/SubmitButton';
import { useT } from '@/i18n/client';

type P = { fullName: string; headline: string; location: string; phone: string; linkedinUrl: string; portfolioUrl: string; summary: string; coverNote: string; cvKey: string | null; cvOriginalName: string | null };

export function ProfileForm({ profile, next, user }: { profile: P; next?: string; user: { email: string; isPro: boolean; hasStripe: boolean; billing: boolean } }) {
  const p = useT().profile;
  const [state, action] = useActionState<FormState, FormData>(saveProfile, undefined);
  return (
    <>
      <Flash state={state} />
      <form action={action} className="two-col">
        {next && <input type="hidden" name="next" value={next} />}
        <label>{p.fullName} <input name="fullName" dir="auto" defaultValue={profile.fullName} required /></label>
        <label>{p.headline} <input name="headline" dir="auto" defaultValue={profile.headline} placeholder={p.headlinePh} /></label>
        <label>{p.location} <input name="location" dir="auto" defaultValue={profile.location} placeholder={p.locationPh} /></label>
        <label>{p.phone} <input name="phone" dir="ltr" defaultValue={profile.phone} /></label>
        <label>{p.linkedin} <input type="url" name="linkedinUrl" dir="ltr" defaultValue={profile.linkedinUrl} placeholder="https://" /></label>
        <label>{p.portfolio} <input type="url" name="portfolioUrl" dir="ltr" defaultValue={profile.portfolioUrl} placeholder="https://" /></label>
        <label className="full">{p.summary} <textarea name="summary" rows={4} dir="auto" defaultValue={profile.summary} /></label>
        <label className="full">{p.coverNote} <textarea name="coverNote" rows={6} dir="auto" defaultValue={profile.coverNote} placeholder={p.coverPh} /></label>
        <label className="full">{p.cv}
          <input type="file" name="cv" accept=".pdf,.doc,.docx" />
          {profile.cvKey && <small>{p.cvCurrent}<a href="/api/profile/cv">{profile.cvOriginalName}</a>{p.cvReplace}</small>}
        </label>
        <div className="full"><SubmitButton pendingText={p.saving}>{p.save}</SubmitButton></div>
      </form>

      <section className="account-box">
        <h2>{p.account}</h2>
        <p><span dir="ltr">{user.email}</span>{user.billing ? <> — {user.isPro ? p.subscriber : p.freePlan}. <Link href="/subscribe">{user.isPro ? p.manage : p.plans}</Link></> : null}</p>
        <form action={deleteAccount} onSubmit={(e) => { if (!confirm(p.deleteConfirm)) e.preventDefault(); }}>
          <button className="btn danger-btn" type="submit">{p.delete}</button>
          {user.billing && user.isPro && user.hasStripe && <p className="hint">{p.cancelFirst}</p>}
        </form>
      </section>
    </>
  );
}
