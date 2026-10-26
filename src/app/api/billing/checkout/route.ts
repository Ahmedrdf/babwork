import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, users } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { env } from '@/lib/env';
import { stripe } from '@/lib/stripe';
import { isPremiumPrice, isBillingMarket, isBillingOrigin, type BillingMarket } from '@/lib/premium';
import { createKonnectCheckout } from '@/lib/konnect';
import { rateLimit } from '@/lib/rate-limit';
import { getLocale } from '@/i18n/server';
import { premiumMessages } from '@/i18n/premium';

export async function POST(req: NextRequest) {
  const t = premiumMessages[await getLocale()];
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: t.accessError }, { status: 401 });
  if (!isBillingOrigin(req.headers.get('origin'), req.url, req.headers.get('host'), env.APP_URL)) return new NextResponse('Forbidden', { status: 403 });
  if (env.freeLaunchEnabled) return NextResponse.json({ error: t.unavailable }, { status: 409 });
  if (env.cvMatchingPreviewEnabled) return NextResponse.json({ error: t.preview }, { status: 409 });
  let market: BillingMarket = 'INTL';
  if (req.body) {
    try {
      const body = await req.json();
      if (!isBillingMarket(body.market)) return new NextResponse('Invalid billing market', { status: 400 });
      market = body.market;
    } catch { return new NextResponse('Invalid request', { status: 400 }); }
  }
  if (market === 'TN' ? !env.konnectPaymentsEnabled : !stripe || !env.paymentsEnabled) return NextResponse.json({ error: t.unavailable }, { status: 503 });
  if (market === 'INTL' && user.isPro) return NextResponse.json({ error: t.already }, { status: 409 });
  if (!(await rateLimit(`checkout:${user.id}`, 10, 3600))) return NextResponse.json({ error: t.checkoutError }, { status: 429 });
  try {
    if (market === 'TN') return NextResponse.json({ url: await createKonnectCheckout(user), market });
    if (!stripe) return NextResponse.json({ error: t.unavailable }, { status: 503 });
    const price = await stripe.prices.retrieve(env.STRIPE_PRICE_ID);
    if (!isPremiumPrice(price)) throw new Error('STRIPE_PRICE_ID must be an active EUR 9.00 monthly recurring Price.');
    let customer = user.stripeCustomerId;
    if (!customer) {
      const created = await stripe.customers.create({ email: user.email, metadata: { user_id: String(user.id) } },
        { idempotencyKey: `babwork-customer-${user.id}` });
      customer = created.id;
      await db.update(users).set({ stripeCustomerId: customer }).where(eq(users.id, user.id));
    }
    const subscriptions = await stripe.subscriptions.list({ customer, status: 'all', limit: 100 });
    if (subscriptions.data.some(s => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status)
      && s.items.data.some(item => item.price.id === env.STRIPE_PRICE_ID))) {
      return NextResponse.json({ error: t.already }, { status: 409 });
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', customer, client_reference_id: String(user.id),
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: { metadata: { user_id: String(user.id) } },
      success_url: `${env.APP_URL}/api/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.APP_URL}/subscribe?cancelled=1`,
    }, { idempotencyKey: `babwork-checkout-${user.id}-${Math.floor(Date.now() / 300000)}` });
    if (!session.url) throw new Error('Checkout URL was not returned.');
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[billing] checkout failed', error);
    return NextResponse.json({ error: t.checkoutError }, { status: 502 });
  }
}
