import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { syncSubscription } from '@/lib/subscriptions';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login?next=/recommendations', env.APP_URL));
  const id = req.nextUrl.searchParams.get('session_id');
  if (stripe && id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(id);
      const customer = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const subscription = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      if (session.mode === 'subscription' && session.payment_status === 'paid' && customer === user.stripeCustomerId
        && session.client_reference_id === String(user.id) && subscription && await syncSubscription(subscription)) {
        return NextResponse.redirect(new URL('/recommendations', env.APP_URL));
      }
    } catch (error) { console.error('[billing] checkout confirmation failed', error); }
  }
  return NextResponse.redirect(new URL('/subscribe?pending=1', env.APP_URL));
}
