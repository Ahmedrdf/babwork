'use client';
import { useT } from '@/i18n/client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const t = useT().error;
  return <section className="auth"><h1>{t.title}</h1><p dir="auto">{error.message}</p><button className="btn" onClick={reset}>{t.retry}</button></section>;
}
