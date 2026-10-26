import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, profiles } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { getLocale } from '@/i18n/server';
import { premiumMessages } from '@/i18n/premium';
import { Matcher } from './Matcher';
import { env } from '@/lib/env';
import { getBillingMarket } from '@/lib/billing-market';
import { getPremiumMessages } from '@/i18n/billing';
import { matchingAccess } from '@/lib/matching-access';
import { improvements } from '@/i18n/improvements';
import { launchMessages } from '@/i18n/launch';

export async function generateMetadata() { return { title: premiumMessages[await getLocale()].matches }; }

export default async function Recommendations() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  if (!user) redirect('/login?next=/recommendations');
  const t = getPremiumMessages(locale, await getBillingMarket());
  const access = await matchingAccess(user);
  if (access === 'locked') return <section className="premium-page">
    <p className="eyebrow">Premium</p><h1>{t.matches}</h1>
    {env.pricingVisible ? <><p className="lede">{t.locked}</p><p>{improvements[locale].trialUsed}</p><Link className="btn" href="/subscribe">{t.subscribe}</Link></>
      : <><p className="lede">{improvements[locale].trialFinished}</p><Link className="btn" href="/jobs">{improvements[locale].browse}</Link></>}
  </section>;
  const [profile] = await db.select({ name: profiles.cvOriginalName }).from(profiles).where(eq(profiles.userId, user.id));
  return <section className="matching-page"><p className="eyebrow">{env.freeLaunchEnabled ? launchMessages[locale].badge : 'Premium'}</p><h1>{t.matches}</h1>
    {env.freeLaunchEnabled && <p className="matching-notice">{launchMessages[locale].info}</p>}
    {!env.freeLaunchEnabled && env.cvMatchingPreviewEnabled && <p className="warn" role="status">{t.preview}</p>}
    {access === 'trial' && <p className="matching-notice">{env.pricingVisible ? improvements[locale].trialNotice : improvements[locale].freeTrialShort}</p>}
    <p className="lede">{t.matchIntro}</p><Matcher savedCvName={profile?.name ?? null} trial={access === 'trial'} showPricing={env.pricingVisible} />
  </section>;
}
