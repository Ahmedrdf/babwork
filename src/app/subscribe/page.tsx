import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { env } from '@/lib/env';
import { getLocale } from '@/i18n/server';
import { premiumMessages } from '@/i18n/premium';
import { INTL } from '@/i18n/config';
import { PremiumSteps, PremiumFaq } from '@/components/PremiumDiscovery';
import { PaymentForm } from './PaymentForm';
import { getBillingMarket, paymentAvailable } from '@/lib/billing-market';
import { premiumPrice } from '@/lib/premium';
import { billingMessages, getPremiumMessages, getDiscoveryMessages } from '@/i18n/billing';
import { selectBillingMarket } from '@/actions/billing';
import { improvements } from '@/i18n/improvements';

export async function generateMetadata() { return { title: premiumMessages[await getLocale()].nav }; }

export default async function SubscribePage({ searchParams }: { searchParams: Promise<{ cancelled?: string; pending?: string; country?: string }> }) {
  if (!env.pricingVisible) redirect('/about');
  const [user, locale, sp] = await Promise.all([getCurrentUser(), getLocale(), searchParams]);
  const market = await getBillingMarket(sp.country);
  const t = getPremiumMessages(locale, market);
  const d = getDiscoveryMessages(locale, market);
  const b = billingMessages[locale];
  const price = premiumPrice(market, locale);
  const available = paymentAvailable(market);
  const canRenew = market === 'TN' && user?.isPro && !user.stripeSubscriptionId;
  const preview = env.cvMatchingPreviewEnabled;
  return (
    <section className="premium-page premium-landing">
      <header className="premium-intro">
        <p className="eyebrow"><Sparkles size={15} aria-hidden="true" />Babwork Premium</p>
        <h1>{t.title}</h1><p className="lede">{t.intro}</p>
        <div className="premium-reassurance"><ShieldCheck size={16} aria-hidden="true" />{d.private}<span aria-hidden="true">·</span>{t.cancelAnytime}</div>
      </header>
      <form className="billing-market" action={selectBillingMarket}><label>{b.country}<select name="market" defaultValue={market}>
        <option value="TN">{b.tunisia}</option><option value="INTL">{b.international}</option></select></label>
        <button className="btn ghost" type="submit">{b.update}</button></form>
      {preview && <p className="warn" role="status">{t.preview}</p>}
      {market === 'TN' && env.KONNECT_MODE === 'sandbox' && !preview && <p className="warn">{b.sandbox}</p>}
      {sp.cancelled && <p className="warn">{t.cancelled}</p>}
      {sp.pending && !user?.isPro && <p className="warn">{t.pending}</p>}
      <div className="plans pricing-plans">
        <div className="plan-col plan-free"><span className="plan-eyebrow">Babwork</span><h2>{t.free}</h2><p className="plan-description">{d.freeDescription}</p>
          <p className="plan-price"><bdi>0 {market === 'TN' ? 'DT' : '€'}</bdi></p>
          <ul className="plan-benefits">{t.freeBenefits.map(text => <li key={text}><Check size={18} aria-hidden="true" /><span>{text}</span></li>)}</ul>
          <Link className="btn ghost plan-action" href="/jobs">{t.browse}<ArrowRight size={17} className="action-arrow" aria-hidden="true" /></Link>
        </div>
        <div className="plan-col plan-pro"><span className="premium-badge"><Sparkles size={14} aria-hidden="true" />{d.badge}</span>
          <h2>Premium</h2><p className="plan-description">{d.proDescription}</p>
          <p className="plan-price"><bdi>{price}</bdi> <span>{t.month}</span></p>
          <ul className="plan-benefits">{t.premiumBenefits.map(text => <li key={text}><Check size={18} aria-hidden="true" /><span>{text}</span></li>)}</ul>
          <div className="pricing-action">
            {preview || (user?.isPro && !canRenew) ? <Link className="btn btn-premium" href="/recommendations">{preview ? t.tryMatching : t.matches}<ArrowRight size={17} className="action-arrow" aria-hidden="true" /></Link>
              : !available ? <><Link className="btn btn-premium" href="/recommendations">{t.discover}<ArrowRight size={17} className="action-arrow" aria-hidden="true" /></Link><p className="pricing-unavailable">{t.unavailable}</p></>
                : user ? <PaymentForm market={market} renew={!!canRenew} /> : <Link className="btn btn-premium" href={`/login?next=${encodeURIComponent(`/subscribe?country=${market}`)}`}>{t.signIn}<ArrowRight size={17} className="action-arrow" aria-hidden="true" /></Link>}
            <small>{t.cancelAnytime}</small>
          </div>
        </div>
      </div>
      {!user?.isPro && <div className="matching-notice"><p>{improvements[locale].trialNotice}</p><Link className="btn ghost" href="/recommendations">{improvements[locale].trial}</Link></div>}
      {user?.isPro && <div className="subscription-state"><p className="done">{t.active}</p>
        {user.subscriptionEndsAt && <p>{t.renews} {user.subscriptionEndsAt.toLocaleDateString(INTL[locale])}</p>}</div>}
      {user?.stripeCustomerId && env.STRIPE_SECRET_KEY && <form className="billing-manage" method="post" action="/api/billing/portal"><button className="linkish">{t.manage}</button></form>}
      <PremiumSteps locale={locale} />
      <PremiumFaq locale={locale} market={market} />
    </section>
  );
}
