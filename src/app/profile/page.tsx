import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, profiles } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { getT } from '@/i18n/server';
import { ProfileForm } from './ProfileForm';
import { PremiumNudge } from '@/components/PremiumDiscovery';
import { getLocale } from '@/i18n/server';
import { getBillingMarket } from '@/lib/billing-market';
import { env } from '@/lib/env';
export async function generateMetadata() { return { title: (await getT()).meta.profile }; }

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ next?: string; welcome?: string; missing?: string; verification?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/profile');
  const [sp, t] = await Promise.all([searchParams, getT()]);
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  return (
    <section className="form-page">
      <h1>{t.profile.title}</h1>
      {sp.welcome && <p className="done">{t.profile.welcome}</p>}
      {sp.verification === 'pending' && !user.emailVerifiedAt && <p className="warn" role="status">{t.profile.verificationPending}</p>}
      {sp.missing && <p className="warn">{t.profile.missing}</p>}
      <p className="quiet">{t.profile.intro}</p>
      <ProfileForm profile={profile} next={sp.next} user={{ email: user.email, isPro: user.isPro, hasStripe: !!user.stripeCustomerId, billing: env.pricingVisible }} />
      {profile?.cvKey && <PremiumNudge locale={await getLocale()} isPro={user.isPro} context="profile" market={await getBillingMarket()} />}
    </section>
  );
}
