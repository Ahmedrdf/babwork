import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getT } from '@/i18n/server';
import { LoginForm } from '@/components/AuthForm';
export async function generateMetadata() { return { title: (await getT()).meta.signIn }; }
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect('/jobs');
  const { next } = await searchParams;
  return <LoginForm next={next} />;
}
