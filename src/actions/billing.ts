'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isBillingMarket } from '@/lib/premium';

export async function selectBillingMarket(form: FormData) {
  const market = form.get('market');
  if (!isBillingMarket(market)) return;
  (await cookies()).set('bw_billing_market', market, { path: '/', maxAge: 15552000, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  redirect(`/subscribe?country=${market}`);
}
