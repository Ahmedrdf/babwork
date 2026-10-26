import type { Metadata } from 'next';
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
import './discovery.css';
import { getCurrentUser } from '@/lib/auth';
import { getVisitor } from '@/lib/visitor';
import { getLocale } from '@/i18n/server';
import { messages } from '@/i18n/messages';
import { DIR } from '@/i18n/config';
import { LocaleProvider } from '@/i18n/client';
import { VerifyBar } from '@/components/VerifyBar';
import { RegionDetect } from '@/components/RegionDetect';
import { SiteFooter } from '@/components/SiteFooter';
import { env } from '@/lib/env';
import { SiteHeader } from '@/components/SiteHeader';

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
  return (
    <html lang={locale} dir={DIR[locale]}>
      <body>
        <LocaleProvider locale={locale}>
          <SiteHeader locale={locale} signedIn={!!user} isAdmin={!!user?.isAdmin} showPricing={env.pricingVisible} />
          <div className="frieze" aria-hidden="true" />
          {user && !user.emailVerifiedAt && <VerifyBar email={user.email} />}
          <RegionDetect known={!!visitor.tz} />
          <main>{children}</main>
          <div className="frieze frieze-foot" aria-hidden="true" />
          <SiteFooter locale={locale} signedIn={!!user} isPro={!!user?.isPro} />
        </LocaleProvider>
      </body>
    </html>
  );
}
