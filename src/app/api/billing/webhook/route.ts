import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db, stripeEvents } from '@/db';
import { stripe } from '@/lib/stripe';
import { syncSubscription } from '@/lib/subscriptions';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) return new NextResponse('Stripe not configured', { status: 400 });
  const sig = req.headers.get('stripe-signature') || '';
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new NextResponse(`Webhook signature failed: ${err instanceof Error ? err.message : err}`, { status: 400 });
  }

  // Idempotency: Stripe retries; process each event id once.
  const inserted = await db.insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing().returning({ id: stripeEvents.id });
  if (inserted.length === 0) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const inv = event.data.object;
        const ref = inv.parent?.subscription_details?.subscription;
        const subId = typeof ref === 'string' ? ref : ref?.id ?? null;
        if (subId) await syncSubscription(subId);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object.id);
        break;
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const ref = event.data.object.subscription;
        if (ref) await syncSubscription(typeof ref === 'string' ? ref : ref.id);
        break;
      }
    }
  } catch (err) {
    console.error('[billing] webhook handler failed', err);
    // Return 500 so Stripe retries; drop the event row so the retry isn't treated as a duplicate.
    await db.delete(stripeEvents).where(eq(stripeEvents.id, event.id));
    return new NextResponse('handler error', { status: 500 });
  }
  return NextResponse.json({ received: true });
}

