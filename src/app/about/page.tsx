import Link from 'next/link';
import { getLocale } from '@/i18n/server';
import { improvements } from '@/i18n/improvements';
import { PremiumFaq } from '@/components/PremiumDiscovery';
import { env } from '@/lib/env';
import { launchMessages } from '@/i18n/launch';

export async function generateMetadata() { return { title: improvements[await getLocale()].about, alternates: { canonical: '/about' } }; }
export default async function About() {
  const locale = await getLocale();
  const t = improvements[locale];
  return <section className="premium-page about-page"><p className="eyebrow">Babwork</p><h1>{t.aboutTitle}</h1><p className="lede">{t.aboutText}</p>
    <div className="about-grid">{[[t.freeTitle, env.freeLaunchEnabled ? launchMessages[locale].freeText : t.freeText], [t.privacyTitle, t.privacyText], [t.honestTitle, t.honestText]].map(([title, text]) => <article className="plan-card" key={title}><h2>{title}</h2><p>{text}</p></article>)}</div>
    <div className="matching-actions"><Link className="btn btn-premium" href="/recommendations">{env.freeLaunchEnabled ? launchMessages[locale].action : t.trial}</Link><Link className="btn ghost" href="/jobs">{t.browse}</Link><Link href="/contact">{t.contact}</Link></div>
    <div id="questions"><PremiumFaq locale={locale} /></div>
  </section>;
}
