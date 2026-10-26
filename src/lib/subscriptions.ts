import 'server-only';
import { eq } from 'drizzle-orm';
import { db, users } from '@/db';
import { stripe, periodEnd } from './stripe';
import { env } from './env';

/** Re-read Stripe's current state so delayed events cannot restore an old state. */
export async function syncSubscription(id: string) {
  if (!stripe) throw new Error('Stripe not configured');
  const sub = await stripe.subscriptions.retrieve(id);
  if (!sub.items.data.some(item => item.price.id === env.STRIPE_PRICE_ID)) return false;
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customer));
  if (!user || sub.metadata.user_id !== String(user.id)) return false;
  const end = periodEnd(sub);
  const active = ['active', 'trialing'].includes(sub.status) && !!end && end > new Date();
  // An event for an old/cancelled subscription must not revoke a newer paid one.
  if (!active && user.stripeSubscriptionId !== sub.id) return false;
  await db.update(users).set({ plan: active ? 'pro' : 'free', premiumSource: 'stripe', stripeSubscriptionId: sub.id,
    subscriptionEndsAt: active ? end : null }).where(eq(users.id, user.id));
  return active;
}
