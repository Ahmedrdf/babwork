import { lt } from 'drizzle-orm';
import { db, sessions, tokens, rateLimits } from '@/db';

/**
 * Housekeeping run with every import: expired sessions, used-up email/reset tokens and
 * rate-limit windows that have closed are deleted. Three statements, no per-row work.
 * (Deliberately free of `server-only` so the ingest script can run it outside Next.js.)
 */
export async function cleanupExpired(now = new Date()) {
  const [s, t, r] = await Promise.all([
    db.delete(sessions).where(lt(sessions.expiresAt, now)).returning({ id: sessions.id }),
    db.delete(tokens).where(lt(tokens.expiresAt, now)).returning({ id: tokens.tokenHash }),
    db.delete(rateLimits).where(lt(rateLimits.resetAt, now)).returning({ id: rateLimits.key }),
  ]);
  return { sessions: s.length, tokens: t.length, rateLimits: r.length };
}
