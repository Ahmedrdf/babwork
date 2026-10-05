import 'server-only';
import Stripe from 'stripe';
import { env } from './env';

export const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

export function periodEnd(sub: Stripe.Subscription): Date | null {
  const ts = sub.items?.data?.[0]?.current_period_end;
  return ts ? new Date(ts * 1000) : null;
}
