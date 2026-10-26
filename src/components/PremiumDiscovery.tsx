import Link from 'next/link';
import { ArrowRight, FileText, ScanSearch, Sparkles } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import { discoveryMessages } from '@/i18n/discovery';
import { premiumMessages } from '@/i18n/premium';
import { env } from '@/lib/env';
import { getPremiumMessages, getDiscoveryMessages } from '@/i18n/billing';
import { premiumPrice, type BillingMarket } from '@/lib/premium';
import { improvements } from '@/i18n/improvements';
import { OpportunityDoor } from './OpportunityDoor';
import { launchMessages } from '@/i18n/launch';

export function premiumAction(locale: Locale, isPro = false) {
  if (env.freeLaunchEnabled) return { href: '/recommendations', label: launchMessages[locale].action };
  if (isPro) return { href: '/recommendations', label: discoveryMessages[locale].primary };
  if (env.cvMatchingPreviewEnabled) return { href: '/recommendations', label: premiumMessages[locale].tryMatching };
  return { href: '/recommendations', label: improvements[locale].trial };
}

export function PremiumPreview({ locale }: { locale: Locale }) {
  return <OpportunityDoor locale={locale} />;
}

export function PremiumNudge({ locale, isPro = false, context = 'jobs', market = 'INTL' }: {
  locale: Locale; isPro?: boolean; context?: 'jobs' | 'profile' | 'home'; market?: BillingMarket;
}) {
  const t = getDiscoveryMessages(locale, market, env.freeLaunchEnabled);
  const premium = getPremiumMessages(locale, market);
  const action = premiumAction(locale, isPro);
  const title = isPro ? t.memberTitle : context === 'home' ? t.bandTitle : context === 'profile' ? t.profileTitle : t.jobsTitle;
  const text = isPro ? t.memberText : context === 'home' ? t.bandText : context === 'profile' ? t.profileText : t.jobsText;
  return <section className={`premium-nudge premium-nudge-${context}`}>
    <div className="nudge-symbol" aria-hidden="true"><Sparkles size={25} /></div>
    <div className="nudge-copy"><span className="nudge-label">{env.freeLaunchEnabled ? launchMessages[locale].matching : 'Babwork Premium'}</span><h2>{title}</h2><p>{text}</p>
      {env.pricingVisible && context === 'home' && !isPro && !env.cvMatchingPreviewEnabled && <small>{premium.cancelAnytime}</small>}</div>
    <div className="nudge-action"><Link className="btn btn-premium" href={action.href}>{action.label}<ArrowRight size={17} className="action-arrow" aria-hidden="true" /></Link>
      {env.pricingVisible && !isPro && !env.cvMatchingPreviewEnabled && <small><bdi>{premiumPrice(market, locale)}</bdi> {premium.month}</small>}</div>
  </section>;
}

export function PremiumSteps({ locale }: { locale: Locale }) {
  const t = getDiscoveryMessages(locale, 'INTL', env.freeLaunchEnabled);
  const steps = [[FileText, t.stepOne, t.stepOneText], [ScanSearch, t.stepTwo, t.stepTwoText], [Sparkles, t.stepThree, t.stepThreeText]] as const;
  return <section className="premium-process"><div className="process-heading"><p className="section-kicker">{t.sample}</p><h2>{t.howTitle}</h2><p>{t.howIntro}</p></div>
    <ol className="process-steps">{steps.map(([Icon, title, text], i) => <li key={title}>
      <div className="process-step-top"><span className="process-icon"><Icon size={25} aria-hidden="true" /></span><span className="process-number" aria-hidden="true">0{i + 1}</span></div>
      <h3>{title}</h3><p>{text}</p></li>)}</ol>
  </section>;
}

export function PremiumFaq({ locale, market = 'INTL' }: { locale: Locale; market?: BillingMarket }) {
  const t = getDiscoveryMessages(locale, market, env.freeLaunchEnabled);
  return <section className="faq premium-faq"><h2>{t.faqTitle}</h2>{[
    [t.faqFree, env.freeLaunchEnabled ? t.faqFreeText : `${t.faqFreeText} ${env.pricingVisible ? improvements[locale].trialNotice : improvements[locale].freeTrialShort}`], [t.faqPrivacy, t.faqPrivacyText], ...(env.pricingVisible ? [[t.faqBilling, t.faqBillingText]] : []), [t.faqResults, t.faqResultsText],
  ].map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>;
}
