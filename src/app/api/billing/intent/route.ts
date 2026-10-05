import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, users } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { env } from '@/lib/env';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (!stripe || !env.paymentsEnabled) return NextResponse.json({ error: 'Payments are not configured.' }, { status: 400 });
  if (user.isPro) return NextResponse.json({ error: 'You already have an active subscription.' }, { status: 400 });

  try {
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: String(user.id) } });
      customerId = customer.id;
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
    }
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: env.STRIPE_PRICE_ID }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.confirmation_secret'],
      metadata: { user_id: String(user.id) },
    });
    const invoice = subscription.latest_invoice;
    const clientSecret = typeof invoice === 'object' && invoice ? invoice.confirmation_secret?.client_secret : null;
    if (!clientSecret) throw new Error('Stripe did not return a client secret.');
    return NextResponse.json({ clientSecret, subscriptionId: subscription.id });
  } catch (err) {
    console.error('[billing] intent failed', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Payment setup failed.' }, { status: 500 });
  }
}
