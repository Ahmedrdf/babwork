import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { db, users } from '@/db';
import { consumeToken } from '@/lib/auth';
import { getT } from '@/i18n/server';
export async function generateMetadata() { return { title: (await getT()).meta.verify }; }
export default async function Verify({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [{ token }, t] = await Promise.all([searchParams, getT()]);
  const userId = token ? await consumeToken(token, 'verify_email') : null;
  if (!userId) {
    return <section className="auth"><h1>{t.verify.expiredTitle}</h1><p>{t.verify.expiredText}</p><p><Link href="/login">{t.verify.signIn}</Link></p></section>;
  }
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  return <section className="auth"><h1>{t.verify.okTitle}</h1><p>{t.verify.okText}</p><p><Link className="btn" href="/jobs">{t.verify.browse}</Link></p></section>;
}
