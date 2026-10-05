'use client';
import { useRouter } from 'next/navigation';
import { LOCALES, LANGUAGE_NAMES, type Locale } from '@/i18n/config';

/** Lets anyone override the automatic language; remembered for a year. */
export function LanguageSwitch({ current, label }: { current: Locale; label: string }) {
  const router = useRouter();
  return (
    <nav className="lang" aria-label={label}>
      {LOCALES.map((l) => (
        <button key={l} type="button" lang={l} className={l === current ? 'on' : ''} aria-current={l === current ? 'true' : undefined}
          onClick={() => { document.cookie = `rp_lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`; router.refresh(); }}>
          {LANGUAGE_NAMES[l]}
        </button>
      ))}
    </nav>
  );
}
