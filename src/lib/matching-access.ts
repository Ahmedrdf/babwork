import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db, matchingTrials } from '@/db';
import { env } from '@/lib/env';

export async function matchingAccess(user: { id: number; isPro: boolean }) {
  if (env.freeLaunchEnabled || user.isPro || env.cvMatchingPreviewEnabled) return 'unlimited' as const;
  const [trial] = await db.select().from(matchingTrials).where(eq(matchingTrials.userId, user.id));
  return trial?.completedAt ? 'locked' as const : 'trial' as const;
}

export async function startMatchingTrial(userId: number) {
  return db.transaction(async tx => {
    await tx.insert(matchingTrials).values({ userId, permit: randomUUID(), expiresAt: new Date(Date.now() + 3600000) }).onConflictDoNothing();
    const [trial] = await tx.select().from(matchingTrials).where(eq(matchingTrials.userId, userId)).for('update');
    if (trial.completedAt) return null;
    if (trial.expiresAt.getTime() > Date.now()) return trial.permit;
    const permit = randomUUID();
    await tx.update(matchingTrials).set({ permit, expiresAt: new Date(Date.now() + 3600000) }).where(eq(matchingTrials.userId, userId));
    return permit;
  });
}

export async function finishMatchingTrial(userId: number, permit: string) {
  return db.transaction(async tx => {
    const [trial] = await tx.select().from(matchingTrials).where(and(eq(matchingTrials.userId, userId), eq(matchingTrials.permit, permit))).for('update');
    if (!trial || trial.expiresAt.getTime() <= Date.now()) return false;
    // Repeating the same completion after a lost response is safe.
    if (trial.completedAt) return true;
    await tx.update(matchingTrials).set({ completedAt: new Date() }).where(and(eq(matchingTrials.userId, userId), isNull(matchingTrials.completedAt)));
    return true;
  });
}
