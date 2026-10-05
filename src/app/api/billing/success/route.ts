import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, users } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { stripe, periodEnd } from '@/lib/stripe';
import { env } from '@/lib/env';

// Stripe.js returns the browser here after confirmPayment. Activate immediately;
// the webhook remains the source of truth afterwards.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', env.APP_URL));
  const subId = req.nextUrl.searchParams.get('subscription');
  const next = req.nextUrl.searchParams.get('next') || '/jobs';
  if (stripe && subId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      if (sub.customer === user.stripeCustomerId && ['active', 'trialing'].includes(sub.status)) {
        await db.update(users).set({ plan: 'pro', stripeSubscriptionId: sub.id, subscriptionEndsAt: periodEnd(sub) }).where(eq(users.id, user.id));
      }
    } catch (err) {
      console.error('[billing] success activation failed', err);
    }
  }
  return NextResponse.redirect(new URL(next.startsWith('/') ? next : '/jobs', env.APP_URL));
}
