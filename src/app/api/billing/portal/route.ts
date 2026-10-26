import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import { isBillingOrigin } from '@/lib/premium';

export async function POST(req: NextRequest) {
  if (!isBillingOrigin(req.headers.get('origin'), req.url, req.headers.get('host'), env.APP_URL)) return new NextResponse('Forbidden', { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', env.APP_URL), 303);
  if (!stripe || !user.stripeCustomerId) return NextResponse.redirect(new URL('/subscribe', env.APP_URL), 303);
  const portal = await stripe.billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: `${env.APP_URL}/profile` });
  return NextResponse.redirect(portal.url, 303);
}
