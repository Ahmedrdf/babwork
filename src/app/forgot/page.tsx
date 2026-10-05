import { getT } from '@/i18n/server';
import { ForgotForm } from '@/components/AuthForm';
export async function generateMetadata() { return { title: (await getT()).meta.forgot }; }
export default function Forgot() { return <ForgotForm />; }
