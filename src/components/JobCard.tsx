import Link from 'next/link';
import type { JobRow } from '@/lib/jobs';
import { isOpenTo, type RegionKey } from '@/lib/regions';
import { messages } from '@/i18n/messages';
import { INTL, type Locale } from '@/i18n/config';

const cap = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/** "3 hours ago", "il y a 3 heures", "قبل 3 ساعات"… */
export function timeAgo(d: Date, locale: Locale) {
  const rtf = new Intl.RelativeTimeFormat(INTL[locale], { numeric: 'auto' });
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return messages[locale].card.justNow;
  if (mins < 60) return cap(rtf.format(-mins, 'minute'));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return cap(rtf.format(-hours, 'hour'));
  const days = Math.floor(hours / 24);
  if (days < 7) return cap(rtf.format(-days, 'day'));
  if (days < 30) return cap(rtf.format(-Math.floor(days / 7), 'week'));
  return cap(rtf.format(-Math.floor(days / 30), 'month'));
}

export const isNew = (d: Date) => Date.now() - d.getTime() < 24 * 36e5;

/** Imported as "20 h/week" or "15–16 h/week"; shown in the visitor's language. */
export function hoursLabel(raw: string, locale: Locale) {
  const m = raw.match(/^([\d–-]+) h\/week$/);
  return m ? messages[locale].card.hours(m[1]) : raw;
}

export function CompanyLogo({ name, logo, className = 'card-logo' }: { name: string; logo: string | null; className?: string }) {
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return <span className={className} aria-hidden="true">{logo ? <img src={logo} alt="" loading="lazy" /> : <span>{initials}</span>}</span>;
}

type Props = { j: JobRow; locale: Locale; compact?: boolean; seen?: boolean; openRegion?: RegionKey | null };

export function JobCard({ j, locale, compact = false, seen = false, openRegion = null }: Props) {
  const t = messages[locale];
  const openTo = openRegion ? isOpenTo(j.location, openRegion) : false;
  const excerpt = (j.excerpt || '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#?\w+;/g, '').trim();
  const tags = (j.tags || []).filter((x) => x && x.length < 22).slice(0, 4);
  const fresh = isNew(j.publishedAt);
  const ago = timeAgo(j.publishedAt, locale);
  return (
    <li className={`card${compact ? ' card-compact' : ''}${seen ? ' card-seen' : ''}`}>
      <Link href={`/jobs/${j.id}`} prefetch={false} className="card-link" aria-label={`${t.card.aria(j.title, j.company)}${seen ? t.card.viewedSuffix : ''}`} />
      <div className="card-head">
        <CompanyLogo name={j.company} logo={j.companyLogo} />
        <div className="card-title">
          <h3 dir="auto">{j.title}</h3>
          <p className="card-co" dir="auto">{j.company}</p>
        </div>
        <div className="card-corner">
          {seen ? <span className="seen-label">{t.card.viewed}</span> : null}
          {fresh && !seen
            ? <time className="fresh" dateTime={j.publishedAt.toISOString()} title={ago}>{t.card.new}</time>
            : <time className="card-time" dateTime={j.publishedAt.toISOString()}>{ago}</time>}
        </div>
      </div>
      {!compact && excerpt && <p className="card-excerpt" dir="auto">{excerpt}</p>}
      {!compact && tags.length > 0 && <p className="card-tags" dir="auto">{tags.map((x) => <span key={x}>{x}</span>)}</p>}
      <div className="card-foot">
        {j.salary ? <p className="card-salary" dir="auto">{j.salary}</p> : null}
        <div className="card-facts">
          <span className="fact">{t.types[j.jobType] ?? j.jobType}</span>
          {j.hoursPerWeek ? <span className="fact">{hoursLabel(j.hoursPerWeek, locale)}</span> : null}
          <span className="fact" dir="auto">{j.location}</span>
          {openTo && openRegion ? <span className="fact fact-open">{t.openTo(t.regions[openRegion].to)}</span> : null}
          {j.directApply ? <span className="fact fact-direct">{t.card.direct}</span> : null}
        </div>
      </div>
    </li>
  );
}
