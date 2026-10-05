import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getT } from '@/i18n/server';
import { RegisterForm } from '@/components/AuthForm';
export async function generateMetadata() { return { title: (await getT()).meta.register }; }
export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect('/jobs');
  const { next } = await searchParams;
  return <RegisterForm next={next && next.startsWith('/') && !next.startsWith('//') ? next : undefined} />;
}
