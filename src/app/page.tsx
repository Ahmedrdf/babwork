import Link from 'next/link';
import { homeStats, listJobs, featuredCompanies, topCategories, viewedIds, regionCounts } from '@/lib/jobs';
import { REGIONS, REGION_KEYS } from '@/lib/regions';
import { JobCard } from '@/components/JobCard';
import { CategoryIcon } from '@/components/CategoryIcon';
import { PremiumPreview, PremiumNudge, premiumAction } from '@/components/PremiumDiscovery';
import { ArrowRight, Globe2, ShieldCheck, Sparkles } from 'lucide-react';
import { getBillingMarket } from '@/lib/billing-market';
import { getDiscoveryMessages } from '@/i18n/billing';
import { LogoMark } from '@/components/LogoMark';
import { getCurrentUser } from '@/lib/auth';
import { getVisitor } from '@/lib/visitor';
import { getLocale } from '@/i18n/server';
import { messages } from '@/i18n/messages';
import { INTL } from '@/i18n/config';
import { clock, hourDiff } from '@/lib/time';
import { env } from '@/lib/env';
import { improvements } from '@/i18n/improvements';
import { launchMessages } from '@/i18n/launch';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [stats, latest, companies, categories, user, zones, visitor, locale] = await Promise.all([
    homeStats(), listJobs({ page: 1 }), featuredCompanies(10), topCategories(8), getCurrentUser(), regionCounts(), getVisitor(), getLocale(),
  ]);
  const t = messages[locale];
  const market = await getBillingMarket();
  const d = getDiscoveryMessages(locale, market, env.freeLaunchEnabled);
  const premium = premiumAction(locale, user?.isPro);
  const num = (n: number) => n.toLocaleString(INTL[locale]);
  const recent = latest.jobs.slice(0, 6);
  const seen = await viewedIds(user?.id, recent.map((j) => j.id));
  const now = new Date();
  const order = visitor.region ? [visitor.region, ...REGION_KEYS.filter((k) => k !== visitor.region)] : [...REGION_KEYS];

  return (
    <>
      <section className="hero discovery-hero">
        <div className="hero-text">
          <p className="eyebrow"><Sparkles size={15} aria-hidden="true" />{d.eyebrow}</p>
          <h1>{d.headline}<span>{d.headlineAccent}</span></h1>
          <p className="lede">{d.intro}</p>
          <div className="hero-actions"><Link className="btn btn-premium" href={premium.href}>{premium.label}<ArrowRight size={18} className="action-arrow" aria-hidden="true" /></Link>
            <Link className="hero-secondary" href="/jobs">{d.freeBrowse}<ArrowRight size={16} className="action-arrow" aria-hidden="true" /></Link></div>
          <p className="hero-price-note">{env.freeLaunchEnabled ? launchMessages[locale].info : env.pricingVisible ? d.priceNote : improvements[locale].freeTrialShort}</p>
          <form className="search" action="/jobs" method="get">
            <input type="search" name="q" placeholder={t.home.searchPlaceholder} aria-label={t.jobs.searchAria} />
            <button type="submit" className="btn">{t.home.searchButton}</button>
          </form>
          <ul className="hero-trust"><li><ShieldCheck size={16} aria-hidden="true" />{d.private}</li><li><Globe2 size={16} aria-hidden="true" />{d.multilingual}</li></ul>
        </div>
        <PremiumPreview locale={locale} />
      </section>

      <dl className="discovery-stats"><div><dt>{d.liveJobs}</dt><dd>{num(stats.total)}</dd></div>
        <div><dt>{d.regions}</dt><dd>{num(REGION_KEYS.length)}</dd></div>
        <div><dt>{d.languagesLabel}</dt><dd>{num(3)}</dd></div>
        <div><dt>{d.freeBrowse}</dt><dd>0 {market === 'TN' ? 'DT' : '€'}</dd></div></dl>

      <section className="clockbar" aria-label={t.home.zonesAria}>
        <p className="clock-now">
          {visitor.tz
            ? <>{t.home.clockBefore} <strong>{clock(visitor.tz, now)}</strong> {t.home.clockAfter()}</>
            : t.home.clockNone}
        </p>
        <div className="zones">
          {order.map((k) => {
            const you = visitor.region === k;
            const diff = visitor.tz ? hourDiff(visitor.tz, REGIONS[k].timeZone, now) : undefined;
            return (
              <Link key={k} href={`/jobs?region=${k}`} className={`zone tint-${REGIONS[k].tint}${you ? ' is-you' : ''}`}>
                {you && <span className="you">{t.home.yourRegion}</span>}
                <strong>{t.regions[k].name}</strong>
                <span>{t.home.jobsOpen(zones[k], num(zones[k]))}</span>
                <span className="zone-time">
                  {t.regions[k].city} {clock(REGIONS[k].timeZone, now)}
                  {diff === undefined ? null : <> · {diff ? <><bdi dir="ltr">{diff}</bdi> {t.time.hour}</> : t.time.same}</>}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {companies.length > 0 && (
        <section className="logos" aria-label={t.home.companies}>
          <p className="quiet">{t.home.companies}</p>
          <ul>{companies.map((c) => <li key={c.company} title={c.company}>{c.logo ? <img src={c.logo} alt={c.company} loading="lazy" /> : <span>{c.company}</span>}</li>)}</ul>
        </section>
      )}

      <section>
        <div className="section-head"><h2>{t.home.recent}</h2><Link className="more" href="/jobs">{t.home.seeAll(num(stats.total))}</Link></div>
        {recent.length === 0 ? <p className="empty">{t.home.empty}</p>
          : <ul className="cards">{recent.map((j) => <JobCard key={j.id} j={j} locale={locale} seen={seen.has(j.id)} openRegion={visitor.region} />)}</ul>}
      </section>

      <PremiumNudge locale={locale} isPro={user?.isPro} context="home" market={market} />

      {categories.length > 0 && (
        <section>
          <div className="section-head"><h2>{t.home.categories}</h2></div>
          <ul className="tiles">
            {categories.map((c) => (
              <li key={c.category}>
                <Link href={`/jobs?category=${encodeURIComponent(c.category)}`} className="tile">
                  <CategoryIcon category={c.category} />
                  <strong>{t.categories[c.category] ?? c.category}</strong>
                  <span>{t.home.openRoles(Number(c.n), num(Number(c.n)))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="note">
        <LogoMark size={40} />
        <div>
          <h2>{t.home.whyTitle}</h2>
          {t.home.why.map((p) => <p key={p}>{p}</p>)}
        </div>
      </section>

      <section className="faq">
        <div className="section-head"><h2>{t.home.faqTitle}</h2></div>
        {t.home.faq.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
        {!user && <p className="faq-cta"><Link className="btn" href="/register">{t.home.cta}</Link></p>}
      </section>
    </>
  );
}
