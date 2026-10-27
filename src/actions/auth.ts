'use server';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, users } from '@/db';
import { createSession, createUser, destroySession, verifyPassword, issueToken, consumeToken, hashPassword, clientIp, getCurrentUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { sendMail } from '@/lib/mail';
import { getT } from '@/i18n/server';
import { env } from '@/lib/env';

export type FormState = { error?: string; ok?: string } | undefined;

const emailSchema = z.string().email();

function safeNext(v: FormDataEntryValue | null, fallback = '/jobs') {
  const s = String(v || '');
  return s.startsWith('/') && !s.startsWith('//') ? s : fallback;
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const t = await getT();
  if (!(await rateLimit(`register:${await clientIp()}`, 10, 3600))) return { error: t.errors.tooManySignups };
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  if (!emailSchema.safeParse(email).success) return { error: t.errors.invalidEmail };
  if (password.length < 8 || password.length > 200) return { error: t.errors.shortPassword };
  if (password !== String(form.get('confirmPassword') || '')) return { error: t.errors.passwordMismatch };
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (exists) return { error: t.errors.emailExists };

  const user = await createUser(email, password);
  let verificationPending = !env.mailEnabled;
  if (env.mailEnabled) {
    const token = await issueToken(user.id, 'verify_email');
    try {
      await sendMail({ to: email, subject: t.mail.verifySubject, text: t.mail.verifyText(`${env.APP_URL}/verify?token=${token}`) });
    } catch {
      // The account already exists. A delivery outage must not strand it without a session.
      // Email verification remains required for sensitive email-based actions.
      verificationPending = true;
      console.error('[register] Verification delivery failed; account created with email still unverified.');
    }
  }
  await createSession(user.id);
  const next = safeNext(form.get('next'), '');
  const params = new URLSearchParams({ welcome: '1' });
  if (next) params.set('next', next);
  if (verificationPending) params.set('verification', 'pending');
  redirect(`/profile?${params}`);
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const t = await getT();
  const ip = await clientIp();
  const email = String(form.get('email') || '').trim().toLowerCase();
  if (!(await rateLimit(`login:${ip}`, 20, 900)) || !(await rateLimit(`login:${email}`, 10, 900))) {
    return { error: t.errors.tooManyAttempts };
  }
  const [user] = await db.select().from(users).where(eq(users.email, email));
  const ok = user && (await verifyPassword(String(form.get('password') || ''), user.passwordHash));
  if (!ok) return { error: t.errors.wrongCredentials };
  await createSession(user.id);
  redirect(safeNext(form.get('next')));
}

export async function logout() {
  await destroySession();
  redirect('/');
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const t = await getT();
  // Check before looking up the account so this response cannot reveal whether it exists.
  // The development mail logger does not deliver email and must not report success here.
  if (!env.mailEnabled) return { error: t.errors.resetUnavailable };
  if (!(await rateLimit(`reset:${await clientIp()}`, 5, 3600))) return { error: t.errors.tooManyRequests };
  const email = String(form.get('email') || '').trim().toLowerCase();
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (user) {
    const token = await issueToken(user.id, 'reset_password', 2);
    await sendMail({ to: email, subject: t.mail.resetSubject, text: t.mail.resetText(`${env.APP_URL}/reset?token=${token}`) });
  }
  // Same answer whether or not the account exists
  return { ok: t.errors.resetSent };
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const t = await getT();
  const password = String(form.get('password') || '');
  if (password.length < 8) return { error: t.errors.shortPassword };
  const userId = await consumeToken(String(form.get('token') || ''), 'reset_password');
  if (!userId) return { error: t.errors.resetInvalid };
  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, userId));
  await createSession(userId);
  redirect('/jobs');
}

export async function resendVerification(): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || user.emailVerifiedAt) return undefined;
  const t = await getT();
  if (!env.mailEnabled) return { error: t.errors.verifyUnavailable };
  if (!(await rateLimit(`verify:${user.id}`, 3, 3600))) return { error: t.errors.tooManyRequests };
  const token = await issueToken(user.id, 'verify_email');
  try {
    await sendMail({ to: user.email, subject: t.mail.verifySubject, text: t.mail.verifyText(`${env.APP_URL}/verify?token=${token}`) });
  } catch {
    console.error('[verify] Confirmation delivery failed.');
    return { error: t.errors.verifyUnavailable };
  }
  return { ok: t.errors.verifySent };
}
