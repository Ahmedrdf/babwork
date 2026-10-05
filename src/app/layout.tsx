import type { Metadata } from 'next';
import Link from 'next/link';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
import '@fontsource/el-messiri/500.css';
import '@fontsource/el-messiri/600.css';
import '@fontsource/noto-sans-arabic/400.css';
import '@fontsource/noto-sans-arabic/500.css';
import '@fontsource/noto-sans-arabic/600.css';
import './globals.css';
import { getCurrentUser } from '@/lib/auth';
import { getVisitor } from '@/lib/visitor';
import { logout } from '@/actions/auth';
import { getLocale } from '@/i18n/server';
import { messages } from '@/i18n/messages';
import { DIR } from '@/i18n/config';
import { LocaleProvider } from '@/i18n/client';
import { VerifyBar } from '@/components/VerifyBar';
import { NavLink } from '@/components/NavLink';
import { LogoMark } from '@/components/LogoMark';
import { RegionDetect } from '@/components/RegionDetect';
import { LanguageSwitch } from '@/components/LanguageSwitch';

export async function generateMetadata(): Promise<Metadata> {
  const t = messages[await getLocale()];
  return {
    metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
    title: { default: t.meta.siteTitle, template: '%s · Babwork' },
    description: t.meta.description,
    openGraph: { siteName: 'Babwork', type: 'website' },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, visitor, locale] = await Promise.all([getCurrentUser(), getVisitor(), getLocale()]);
  const t = messages[locale];
  return (
    <html lang={locale} dir={DIR[locale]}>
      <body>
        <LocaleProvider locale={locale}>
          <header className="top">
            <Link className="brand" href="/"><LogoMark /><span className="brand-name"><em>Bab</em>work</span></Link>
            <nav>
              <NavLink href="/jobs">{t.nav.jobs}</NavLink>
              {user ? (
                <>
                  <NavLink href="/applications">{t.nav.applications}</NavLink>
                  <NavLink href="/profile">{t.nav.profile}</NavLink>
                  <form action={logout}><button className="linkish">{t.nav.signOut}</button></form>
                </>
              ) : (
                <>
                  <Link href="/login">{t.nav.signIn}</Link>
                  <Link href="/register" className="pill-link">{t.nav.register}</Link>
                </>
              )}
            </nav>
          </header>
          <div className="frieze" aria-hidden="true" />
          {user && !user.emailVerifiedAt && <VerifyBar email={user.email} />}
          <RegionDetect known={!!visitor.tz} />
          <main>{children}</main>
          <div className="frieze frieze-foot" aria-hidden="true" />
          <footer className="foot">
            <p>{t.footer.note}</p>
            <LanguageSwitch current={locale} label={t.footer.language} />
            <p><Link href="/terms">{t.footer.terms}</Link> · <Link href="/privacy">{t.footer.privacy}</Link></p>
          </footer>
        </LocaleProvider>
      </body>
    </html>
  );
}
