import Link from 'next/link';
import { ArrowRight, Globe2, ScanSearch } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import { messages } from '@/i18n/messages';
import { improvements } from '@/i18n/improvements';
import { signature } from '@/i18n/signature';
import { discoveryMessages } from '@/i18n/discovery';
import { LogoMark } from './LogoMark';
import { LanguageSwitch } from './LanguageSwitch';
import { env } from '@/lib/env';
import { launchMessages } from '@/i18n/launch';

const copy = {
  fr: { next: 'Et si votre prochaine étape commençait ici ?', description: 'Des offres à explorer. Votre expérience pour vous guider.', explore: 'Votre prochaine étape', discover: 'Découvrir Babwork', language: 'À votre façon', languageText: 'Choisissez la langue dans laquelle vous vous sentez chez vous.', account: 'Créer un compte gratuit' },
  en: { next: 'What if your next step started here?', description: 'Opportunities to explore. Your experience to guide you.', explore: 'Your next step', discover: 'Discover Babwork', language: 'Make yourself at home', languageText: 'Choose the language you feel at home in.', account: 'Create a free account' },
  ar: { next: 'ماذا لو بدأت خطوتك القادمة هنا؟', description: 'فرص تستكشفها وخبرتك ترشدك إليها.', explore: 'خطوتك القادمة', discover: 'اكتشف باب وورك', language: 'كما تفضّل', languageText: 'اختر اللغة التي تشعر معها بالراحة.', account: 'إنشاء حساب مجاني' },
};

export function SiteFooter({ locale, signedIn, isPro }: { locale: Locale; signedIn: boolean; isPro: boolean }) {
  const t = messages[locale], c = copy[locale], extra = improvements[locale];
  const action = env.freeLaunchEnabled ? launchMessages[locale].action : isPro ? discoveryMessages[locale].primary : extra.trial;
  return <footer className="foot site-footer">
    <div className="footer-invitation">
      <span className="footer-door" aria-hidden="true"><LogoMark size={36} /></span>
      <div><p className="footer-kicker">Babwork</p><h2>{c.next}</h2><p>{c.description}</p></div>
      <Link className="btn btn-premium" href="/recommendations"><ScanSearch size={18} aria-hidden="true" />{action}<ArrowRight className="action-arrow" size={17} aria-hidden="true" /></Link>
    </div>
    <div className="footer-columns">
      <div className="footer-identity"><Link className="brand" href="/"><LogoMark size={27} /><span className="brand-name"><em>Bab</em>work</span></Link>
        <p className="footer-tagline">{signature[locale].title}</p><p className="footer-description">{c.description}</p>
      </div>
      <nav className="footer-links" aria-label={c.explore}><h3>{c.explore}</h3>
        <Link href="/jobs">{t.nav.jobs}</Link><Link href="/jobs?country=TN">{extra.tunisia}</Link><Link href="/recommendations">{action}</Link>
        {!signedIn && <Link href="/register">{c.account}</Link>}
      </nav>
      <nav className="footer-links" aria-label={c.discover}><h3>{c.discover}</h3>
        <Link href="/about">{extra.about}</Link><Link href="/contact">{extra.contact}</Link><Link href="/about#questions">FAQ</Link>
      </nav>
      <div className="footer-languages"><h3><Globe2 size={16} aria-hidden="true" />{c.language}</h3><p>{c.languageText}</p><LanguageSwitch current={locale} label={t.footer.language} /></div>
    </div>
    <div className="footer-bottom"><p>{t.footer.note}</p><nav aria-label={t.footer.legal}><Link href="/terms">{t.footer.terms}</Link><Link href="/privacy">{t.footer.privacy}</Link><Link href="/legal">{t.footer.legal}</Link></nav></div>
  </footer>;
}
