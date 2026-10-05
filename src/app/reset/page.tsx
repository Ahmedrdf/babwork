import Link from 'next/link';
import { getT } from '@/i18n/server';
import { ResetForm } from '@/components/AuthForm';
export async function generateMetadata() { return { title: (await getT()).meta.reset }; }
export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [{ token }, t] = await Promise.all([searchParams, getT()]);
  if (!token) return <section className="auth"><h1>{t.auth.invalidLink}</h1><p><Link href="/forgot">{t.auth.requestNew}</Link></p></section>;
  return <ResetForm token={token} />;
}
