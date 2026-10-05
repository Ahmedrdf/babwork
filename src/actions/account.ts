'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db, profiles, applications, savedJobs, jobs, users, jobViews } from '@/db';
import { getCurrentUser, destroySession } from '@/lib/auth';
import { putCv, deleteCv, getCv } from '@/lib/storage';
import { sendMail } from '@/lib/mail';
import { rateLimit } from '@/lib/rate-limit';
import type { FormState } from './auth';
import { getT } from '@/i18n/server';

const MAX_CV = 5 * 1024 * 1024;
const CV_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export async function saveProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const t = await getT();
  const f = (k: string, max = 300) => String(form.get(k) || '').trim().slice(0, max);
  const [current] = await db.select().from(profiles).where(eq(profiles.userId, user.id));

  let cvKey = current?.cvKey ?? null;
  let cvOriginalName = current?.cvOriginalName ?? null;
  const file = form.get('cv');
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_CV) return { error: t.errors.cvSize };
    if (!CV_TYPES.includes(file.type) && !/\.(pdf|docx?)$/i.test(file.name)) return { error: t.errors.cvType };
    const newKey = await putCv(user.id, file);
    if (cvKey) await deleteCv(cvKey).catch(() => {});
    cvKey = newKey; cvOriginalName = file.name.slice(0, 200);
  }

  await db.update(profiles).set({
    fullName: f('fullName'), headline: f('headline'), location: f('location'), phone: f('phone', 40),
    linkedinUrl: f('linkedinUrl'), portfolioUrl: f('portfolioUrl'), summary: f('summary', 3000), coverNote: f('coverNote', 4000),
    cvKey, cvOriginalName, updatedAt: new Date(),
  }).where(eq(profiles.userId, user.id));
  revalidatePath('/profile');
  const next = String(form.get('next') || '');
  if (next.startsWith('/') && !next.startsWith('//')) redirect(next);
  return { ok: t.errors.profileSaved };
}

export async function toggleSaved(jobId: number) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/jobs/${jobId}`);
  const [exists] = await db.select().from(savedJobs).where(and(eq(savedJobs.userId, user.id), eq(savedJobs.jobId, jobId)));
  if (exists) await db.delete(savedJobs).where(and(eq(savedJobs.userId, user.id), eq(savedJobs.jobId, jobId)));
  else await db.insert(savedJobs).values({ userId: user.id, jobId });
  revalidatePath(`/jobs/${jobId}`);
}

const EMAIL_APPLY_DAILY_LIMIT = 15;

/** Email the candidate's CV and cover note to the contact address in the listing. */
export async function apply(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const jobId = Number(form.get('jobId'));
  if (!user) redirect(`/login?next=/jobs/${jobId}`);
  const t = await getT();

  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.active, true)));
  if (!job) return { error: t.errors.listingClosed };
  if (!job.applyEmail) return { error: t.errors.siteOnly };
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  if (!profile?.fullName || !profile.cvKey) redirect(`/profile?next=/jobs/${jobId}&missing=1`);

  // Safeguards: email applications go out from our domain, so they must not become a spam channel
  if (!user.emailVerifiedAt) return { error: t.errors.confirmFirst };
  if (!(await rateLimit(`apply-email:${user.id}`, EMAIL_APPLY_DAILY_LIMIT, 86400))) {
    return { error: t.errors.dailyLimit(EMAIL_APPLY_DAILY_LIMIT) };
  }

  const coverNote = String(form.get('coverNote') || profile.coverNote || '').slice(0, 4000);
  try {
    const cv = await getCv(profile.cvKey!);
    await sendMail({
      to: job.applyEmail,
      replyTo: user.email,
      subject: `Application: ${job.title} — ${profile.fullName}`,
      text: [`Application for: ${job.title}`, '', coverNote || `Hello,\n\nI'd like to apply for the ${job.title} role. My CV is attached.`, '', '—',
        profile.fullName, profile.headline, user.email, profile.phone, profile.linkedinUrl, profile.portfolioUrl].filter(Boolean).join('\n'),
      attachments: [{ filename: profile.cvOriginalName || 'cv.pdf', content: cv }],
    });
  } catch (err) {
    console.error('[apply] email failed', err);
    return { error: t.errors.emailFailed };
  }
  // Logged only once the email has actually gone out
  await db.insert(applications).values({ userId: user.id, jobId, method: 'email', coverNote })
    .onConflictDoUpdate({ target: [applications.userId, applications.jobId], set: { method: 'email', coverNote } });
  revalidatePath(`/jobs/${jobId}`);
  return { ok: t.errors.emailed(job.company) };
}

/** The user opened the employer's own form (in a new tab): add it to their tracker. */
export async function logRedirectApplication(jobId: number) {
  const user = await getCurrentUser();
  if (!user || !Number.isInteger(jobId)) return { ok: false };
  const [job] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, jobId));
  if (!job) return { ok: false };
  await db.insert(applications).values({ userId: user.id, jobId, method: 'redirect' }).onConflictDoNothing();
  return { ok: true };
}

export async function setApplicationStatus(id: number, status: 'applied' | 'interviewing' | 'rejected' | 'offer') {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  await db.update(applications).set({ status }).where(and(eq(applications.id, id), eq(applications.userId, user.id)));
  revalidatePath('/applications');
}

export async function deleteAccount() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  if (profile?.cvKey) await deleteCv(profile.cvKey).catch(() => {});
  await destroySession();
  await db.delete(users).where(eq(users.id, user.id)); // cascades to profile, sessions, applications
  redirect('/');
}

/** Record that the current user opened a job, so cards they've seen are marked as viewed. */
export async function markViewed(jobId: number) {
  const user = await getCurrentUser();
  if (!user || !Number.isInteger(jobId)) return;
  await db.insert(jobViews).values({ userId: user.id, jobId })
    .onConflictDoUpdate({ target: [jobViews.userId, jobViews.jobId], set: { viewedAt: new Date() } });
  revalidatePath('/jobs'); // the list shows the card as viewed when the user comes back
}
