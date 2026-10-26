import Link from 'next/link';
import type { Metadata } from 'next';
import { listJobs, topCategories, viewedIds, JOB_TYPES, isRegion } from '@/lib/jobs';
import { REGION_KEYS } from '@/lib/regions';
import { JobCard } from '@/components/JobCard';
import { getCurrentUser } from '@/lib/auth';
import { getVisitor } from '@/lib/visitor';
import { getLocale } from '@/i18n/server';
import { messages } from '@/i18n/messages';
import { INTL } from '@/i18n/config';
import { PremiumNudge } from '@/components/PremiumDiscovery';
import { getBillingMarket } from '@/lib/billing-market';
import { improvements } from '@/i18n/improvements';

type Search = { q?: string; type?: string; category?: string; region?: string; country?: string; direct?: string; salary?: string; hours?: string; view?: string; page?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const [sp, locale] = await Promise.all([searchParams, getLocale()]);
  const t = messages[locale];
  const type = sp.type && (JOB_TYPES as readonly string[]).includes(sp.type) ? t.types[sp.type] : undefined;
  const category = sp.category ? t.categories[sp.category] ?? sp.category : undefined;
  const to = isRegion(sp.region) ? t.regions[sp.region].to : undefined;
  const title = type || category || to ? t.meta.listTitle({ type, category, to }) : t.meta.listDefault;
  return {
    title,
    description: t.meta.listDescription(title),
    alternates: { canonical: sp.category ? `/jobs?category=${encodeURIComponent(sp.category)}` : '/jobs' },
  };
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const f = { q: sp.q || '', type: sp.type || '', category: sp.category || '', region: isRegion(sp.region) ? sp.region : '', direct: sp.direct === '1', salary: sp.salary === '1', hours: sp.hours === '1', page: Number(sp.page) || 1 };
  const compact = sp.view === 'list';
  const country = sp.country === 'TN' ? 'TN' : '';
  const filters = { ...f, country };
  const [{ jobs, total, page, pages }, categories, user, locale] = await Promise.all([listJobs(filters), topCategories(12), getCurrentUser(), getLocale()]);
  const [seen, visitor] = await Promise.all([viewedIds(user?.id, jobs.map((j) => j.id)), getVisitor()]);
  const t = messages[locale];
  const hasFilters = !!(f.q || f.type || f.category || f.region || f.direct || f.salary || f.hours || country);
  const catName = (c: string) => t.categories[c] ?? c;

  const qs = (over: Partial<typeof f> & { view?: string; country?: string }) => {
    const p = new URLSearchParams();
    const m = { ...f, country, view: sp.view, ...over };
    if (m.country) p.set('country', m.country);
    if (m.q) p.set('q', m.q); if (m.type) p.set('type', m.type); if (m.category) p.set('category', m.category); if (m.region) p.set('region', m.region);
    if (m.direct) p.set('direct', '1'); if (m.salary) p.set('salary', '1'); if (m.hours) p.set('hours', '1');
    if (m.view) p.set('view', m.view);
    if (m.page && m.page > 1) p.set('page', String(m.page));
    const str = p.toString();
    return str ? `/jobs?${str}` : '/jobs';
  };

  return (
    <section className="browse">
      <aside className="facets">
        <form method="get" action="/jobs" className="facet-form">
          {sp.view && <input type="hidden" name="view" value={sp.view} />}
          <input type="search" name="q" defaultValue={f.q} placeholder={t.jobs.searchPlaceholder} aria-label={t.jobs.searchAria} />

          <fieldset>
            <legend>{t.jobs.region}</legend>
            <label className="radio"><input type="radio" name="region" value="" defaultChecked={!f.region} /> {t.jobs.anyRegion}</label>
            {REGION_KEYS.map((k) => (
              <label key={k} className="radio">
                <input type="radio" name="region" value={k} defaultChecked={f.region === k} /> {t.regions[k].name}
                {visitor.region === k ? <small className="you-tag">{t.jobs.you}</small> : null}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>{t.jobs.contract}</legend>
            <label className="radio"><input type="radio" name="type" value="" defaultChecked={!f.type} /> {t.jobs.any}</label>
            {JOB_TYPES.map((x) => <label key={x} className="radio"><input type="radio" name="type" value={x} defaultChecked={f.type === x} /> {t.types[x]}</label>)}
          </fieldset>

          <fieldset>
            <legend>{t.jobs.onlyShow}</legend>
            <label className="check"><input type="checkbox" name="country" value="TN" defaultChecked={country === 'TN'} /> {improvements[locale].tunisia}</label>
            <label className="check"><input type="checkbox" name="direct" value="1" defaultChecked={f.direct} /> {t.jobs.direct}</label>
            <label className="check"><input type="checkbox" name="salary" value="1" defaultChecked={f.salary} /> {t.jobs.salary}</label>
            <label className="check"><input type="checkbox" name="hours" value="1" defaultChecked={f.hours} /> {t.jobs.hours}</label>
          </fieldset>

          {f.category && <input type="hidden" name="category" value={f.category} />}
          <button type="submit" className="btn">{t.jobs.apply}</button>
          {hasFilters && <Link className="clear" href={qs({ q: '', type: '', category: '', region: '', country: '', direct: false, salary: false, hours: false, page: 1 })}>{t.jobs.clear}</Link>}
        </form>

        {categories.length > 0 && (
          <div className="facet-cats">
            <h4>{t.jobs.category}</h4>
            {categories.map((c) => (
              <Link key={c.category} href={qs({ category: f.category === c.category ? '' : c.category, page: 1 })} className={f.category === c.category ? 'on' : ''}>
                <span>{catName(c.category)}</span><small>{Number(c.n).toLocaleString(INTL[locale])}</small>
              </Link>
            ))}
          </div>
        )}
      </aside>

      <div className="results">
        {country && <p className="matching-notice">{improvements[locale].tunisiaHint}</p>}
        <PremiumNudge locale={locale} isPro={user?.isPro} context="jobs" market={await getBillingMarket()} />
        <div className="results-bar">
          <p className="count">
            <strong>{total.toLocaleString(INTL[locale])}</strong> {t.jobs.countWord(total)}
            {f.q ? t.jobs.forQuery(f.q) : null}{f.category ? t.jobs.inCategory(catName(f.category)) : null}
            {f.region ? t.jobs.openToRegion(t.regions[f.region as keyof typeof t.regions].to) : null}
            {!user && <> · <Link href="/register">{t.jobs.freeAccount}</Link>{t.jobs.freeAccountRest}</>}
          </p>
          <div className="view-toggle" role="group" aria-label={t.jobs.view}>
            <Link href={qs({ view: undefined })} className={!compact ? 'on' : ''} aria-current={!compact ? 'true' : undefined}>{t.jobs.cards}</Link>
            <Link href={qs({ view: 'list' })} className={compact ? 'on' : ''} aria-current={compact ? 'true' : undefined}>{t.jobs.list}</Link>
          </div>
        </div>

        {jobs.length === 0 ? <p className="empty">{t.jobs.empty}</p>
          : <ul className={compact ? 'cards cards-list' : 'cards'}>{jobs.map((j) => <JobCard key={j.id} j={j} locale={locale} compact={compact} seen={seen.has(j.id)} openRegion={visitor.region} />)}</ul>}

        {pages > 1 && (
          <nav className="pager">
            {page > 1 && <Link href={qs({ page: page - 1 })}>{t.jobs.newer}</Link>}
            <span>{t.jobs.page(page, pages)}</span>
            {page < pages && <Link href={qs({ page: page + 1 })}>{t.jobs.older}</Link>}
          </nav>
        )}
      </div>
    </section>
  );
}
