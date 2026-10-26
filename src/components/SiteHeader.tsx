'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { BriefcaseBusiness, ScanSearch, ClipboardList, UserRound, ChevronDown, Menu, X, LogOut, ShieldCheck, ArrowRight, Globe2 } from 'lucide-react';
import { logout } from '@/actions/auth';
import type { Locale } from '@/i18n/config';
import { messages } from '@/i18n/messages';
import { improvements } from '@/i18n/improvements';
import { NavLink } from './NavLink';
import { LogoMark } from './LogoMark';
import { LanguageSwitch } from './LanguageSwitch';

const copy = {
  fr: { analyze: 'Analyser mon CV', register: 'Créer un compte gratuit', main: 'Navigation principale', menu: 'Menu', account: 'Mon compte', language: 'Langue du site' },
  en: { analyze: 'Match my CV', register: 'Create a free account', main: 'Main navigation', menu: 'Menu', account: 'My account', language: 'Site language' },
  ar: { analyze: 'تحليل سيرتي', register: 'إنشاء حساب مجاني', main: 'التنقل الرئيسي', menu: 'القائمة', account: 'حسابي', language: 'لغة الموقع' },
};

export function SiteHeader({ locale, signedIn, isAdmin, showPricing }: { locale: Locale; signedIn: boolean; isAdmin: boolean; showPricing: boolean }) {
  const t = messages[locale], c = copy[locale];
  const profile = useRef<HTMLDetailsElement>(null);
  const mobile = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function outside(event: PointerEvent) {
      for (const ref of [profile, mobile]) if (ref.current?.open && !ref.current.contains(event.target as Node)) ref.current.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      for (const ref of [profile, mobile]) if (ref.current?.open) { ref.current.open = false; ref.current.querySelector('summary')?.focus(); }
    }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, []);

  function closeOnLink(event: React.MouseEvent) {
    if (!(event.target as Element).closest('a')) return;
    if (profile.current) profile.current.open = false;
    if (mobile.current) mobile.current.open = false;
  }

  const links = <><NavLink href="/jobs"><BriefcaseBusiness size={17} aria-hidden="true" />{t.nav.jobs}</NavLink>
    <NavLink href="/recommendations" className="header-match"><ScanSearch size={17} aria-hidden="true" />{c.analyze}</NavLink>
    {signedIn && <NavLink href="/applications"><ClipboardList size={17} aria-hidden="true" />{t.nav.applications}</NavLink>}</>;
  const accountLinks = <><Link href="/profile"><UserRound size={17} aria-hidden="true" />{t.nav.profile}</Link>
    {isAdmin && <Link href="/admin/reports"><ShieldCheck size={17} aria-hidden="true" />{improvements[locale].moderation}</Link>}
    {showPricing && <Link href="/subscribe">Premium</Link>}</>;
  const signOut = <form action={logout}><button type="submit" className="header-signout"><LogOut size={17} aria-hidden="true" />{t.nav.signOut}</button></form>;

  return <header className="top site-header" onClick={closeOnLink}>
    <Link className="brand header-brand" href="/"><span className="header-logo"><LogoMark size={25} /></span><span className="brand-name"><em>Bab</em>work</span></Link>
    <nav className="header-nav" aria-label={c.main}>{links}</nav>
    <div className="header-account">
      {signedIn ? <details className="profile-dropdown" ref={profile}><summary><span className="header-avatar"><UserRound size={17} aria-hidden="true" /></span>{t.nav.profile}<ChevronDown className="profile-chevron" size={15} aria-hidden="true" /></summary>
        <div className="profile-panel"><p className="header-panel-label">{c.account}</p><div className="header-account-links">{accountLinks}</div>
          <div className="header-language"><p><Globe2 size={14} aria-hidden="true" />{c.language}</p><LanguageSwitch current={locale} label={t.footer.language} /></div>{signOut}</div>
      </details> : <div className="header-visitor"><Link className="header-login" href="/login">{t.nav.signIn}</Link><Link className="header-register" href="/register">{c.register}<ArrowRight className="action-arrow" size={16} aria-hidden="true" /></Link></div>}
    </div>
    <details className="mobile-navigation" ref={mobile}><summary><Menu className="mobile-open-icon" size={22} aria-hidden="true" /><X className="mobile-close-icon" size={22} aria-hidden="true" /><span>{c.menu}</span></summary>
      <div className="mobile-panel"><nav className="mobile-primary" aria-label={c.main}>{links}</nav>
        {signedIn ? <><div className="mobile-account-links"><p className="header-panel-label">{c.account}</p>{accountLinks}</div>{signOut}</> : <div className="mobile-visitor"><Link className="header-register" href="/register">{c.register}<ArrowRight className="action-arrow" size={16} aria-hidden="true" /></Link><Link href="/login">{t.nav.signIn}</Link></div>}
        <div className="header-language"><p><Globe2 size={14} aria-hidden="true" />{c.language}</p><LanguageSwitch current={locale} label={t.footer.language} /></div>
      </div>
    </details>
  </header>;
}
