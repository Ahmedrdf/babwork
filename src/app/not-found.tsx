import Link from 'next/link';
import { getT } from '@/i18n/server';
export default async function NotFound() {
  const t = (await getT()).notFound;
  return <section className="auth"><h1>{t.title}</h1><p>{t.text}</p><p><Link href="/jobs">{t.back}</Link></p></section>;
}
