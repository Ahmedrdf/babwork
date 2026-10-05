import 'server-only';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { eq, and, gt } from 'drizzle-orm';
import { db, users, sessions, profiles, tokens, type User } from '@/db';

const COOKIE = 'rp_session';
const SESSION_DAYS = 30;

export function hashPassword(pw: string) { return bcrypt.hash(pw, 11); }
export function verifyPassword(pw: string, hash: string) { return bcrypt.compare(pw, hash); }
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// ---- sessions ---------------------------------------------------------------
export async function createSession(userId: number) {
  const id = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.insert(sessions).values({ id: sha256(id), userId, expiresAt });
  const jar = await cookies();
  jar.set(COOKIE, id, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await db.delete(sessions).where(eq(sessions.id, sha256(id)));
  jar.delete(COOKIE);
}

export type CurrentUser = User & { isPro: boolean };

export function isPro(u: Pick<User, 'plan' | 'subscriptionEndsAt'>) {
  if (u.plan !== 'pro') return false;
  return !u.subscriptionEndsAt || u.subscriptionEndsAt > new Date();
}

/** Current user for this request, memoised per render. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  const row = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(id)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const user = row[0]?.user;
  return user ? { ...user, isPro: isPro(user) } : null;
});

// ---- accounts ---------------------------------------------------------------
export async function createUser(email: string, password: string) {
  const [user] = await db.insert(users).values({ email, passwordHash: await hashPassword(password) }).returning();
  await db.insert(profiles).values({ userId: user.id });
  return user;
}

// ---- one-time tokens (email verification, password reset) -------------------
export async function issueToken(userId: number, purpose: 'verify_email' | 'reset_password', hours = 24) {
  const raw = randomBytes(32).toString('hex');
  await db.insert(tokens).values({ tokenHash: sha256(raw), userId, purpose, expiresAt: new Date(Date.now() + hours * 3600e3) });
  return raw;
}

export async function consumeToken(raw: string, purpose: string) {
  const [t] = await db.select().from(tokens).where(and(eq(tokens.tokenHash, sha256(raw)), eq(tokens.purpose, purpose), gt(tokens.expiresAt, new Date())));
  if (!t) return null;
  await db.delete(tokens).where(eq(tokens.tokenHash, t.tokenHash));
  return t.userId;
}

export async function clientIp() {
  const h = await headers();
  return (h.get('x-forwarded-for') || h.get('x-nf-client-connection-ip') || 'unknown').split(',')[0].trim();
}
