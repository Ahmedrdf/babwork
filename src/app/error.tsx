'use client';
import { useLocale, useT } from '@/i18n/client';
import { improvements } from '@/i18n/improvements';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  const t = useT().error;
  return <section className="auth"><h1>{t.title}</h1><p>{improvements[useLocale()].friendlyError}</p><button className="btn" onClick={reset}>{t.retry}</button></section>;
}
