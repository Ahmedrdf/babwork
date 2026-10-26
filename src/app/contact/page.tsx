import Link from 'next/link';
import { getLocale } from '@/i18n/server';
import { improvements } from '@/i18n/improvements';

export async function generateMetadata() { return { title: improvements[await getLocale()].contact, alternates: { canonical: '/contact' } }; }
export default async function Contact() {
  const t = improvements[await getLocale()];
  return <section className="premium-page about-page"><h1>{t.contact}</h1><div className="plan-card"><p>{t.helpText}</p><p className="quiet">{t.contactUnavailable}</p>
    <div className="matching-actions"><Link className="btn" href="/jobs">{t.browse}</Link><Link className="btn ghost" href="/about#questions">FAQ</Link></div></div></section>;
}
