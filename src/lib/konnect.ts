import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq, gt, lte } from 'drizzle-orm';
import { db, konnectPayments, users } from '@/db';
import { env } from './env';
import { addPremiumMonth, isCheckoutUrl, PREMIUM_TUNISIA } from './premium';

const referencePattern = /^[a-f0-9]{24}$/i;
export const isKonnectReference = (value: unknown): value is string => typeof value === 'string' && referencePattern.test(value);

function apiRoot() {
  return env.KONNECT_MODE === 'live' ? 'https://api.konnect.network/api/v2' : 'https://api.sandbox.konnect.network/api/v2';
}
async function request(path: string, body?: object) {
  const response = await fetch(`${apiRoot()}${path}`, {
    method: body ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(8000),
    headers: { 'x-api-key': env.KONNECT_API_KEY, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`Konnect request failed (${response.status})`);
  return response.json();
}

export async function createKonnectCheckout(user: { id: number; stripeSubscriptionId: string | null }) {
  if (!env.konnectPaymentsEnabled) throw new Error('Konnect is not configured.');
  // Provider changes must not leave an automatic Stripe subscription billing as well.
  if (user.stripeSubscriptionId) throw new Error('Manage the existing Stripe subscription before changing payment provider.');
  await db.update(konnectPayments).set({ status: 'expired' }).where(and(eq(konnectPayments.userId, user.id),
    eq(konnectPayments.mode, env.KONNECT_MODE), eq(konnectPayments.status, 'pending'), lte(konnectPayments.expiresAt, new Date())));
  const [existing] = await db.select().from(konnectPayments).where(and(eq(konnectPayments.userId, user.id),
    eq(konnectPayments.mode, env.KONNECT_MODE), eq(konnectPayments.status, 'pending'), gt(konnectPayments.expiresAt, new Date())));
  if (existing) {
    if (existing.checkoutUrl && isCheckoutUrl(existing.checkoutUrl, 'TN')) return existing.checkoutUrl;
    throw new Error('A checkout is already being prepared. Try again shortly.');
  }
  const order = { id: randomUUID(), userId: user.id, amount: PREMIUM_TUNISIA.amount, currency: 'TND',
    mode: env.KONNECT_MODE, expiresAt: new Date(Date.now() + 30 * 60000) };
  await db.insert(konnectPayments).values(order);
  try {
    const result = await request('/payments/init-payment', {
      receiverWalletId: env.KONNECT_WALLET_ID, token: 'TND', amount: order.amount, type: 'immediate',
      description: 'Babwork Premium — un mois', acceptedPaymentMethods: ['bank_card', 'e-DINAR', 'wallet'],
      lifespan: 30, checkoutForm: true, addPaymentFeesToAmount: false, orderId: order.id,
      webhook: `${env.APP_URL}/api/billing/konnect/confirm`, theme: 'light',
    });
    if (!isKonnectReference(result.paymentRef) || !isCheckoutUrl(result.payUrl, 'TN')) throw new Error('Invalid Konnect checkout response.');
    await db.update(konnectPayments).set({ paymentRef: result.paymentRef, checkoutUrl: result.payUrl }).where(eq(konnectPayments.id, order.id));
    return result.payUrl as string;
  } catch (error) {
    await db.update(konnectPayments).set({ status: 'failed' }).where(eq(konnectPayments.id, order.id));
    throw error;
  }
}

export function verifiedKonnectPayment(payment: unknown, order: { id: string; amount: number }, wallet: string) {
  if (!payment || typeof payment !== 'object') return false;
  const p = payment as Record<string, unknown>;
  const receiver = p.receiverWallet;
  const receiverId = typeof receiver === 'string' ? receiver : receiver && typeof receiver === 'object'
    ? ((receiver as Record<string, unknown>).id ?? (receiver as Record<string, unknown>)._id) : null;
  return p.status === 'completed' && p.token === 'TND' && p.orderId === order.id && receiverId === wallet
    && Number.isSafeInteger(p.amountDue) && p.amountDue === order.amount
    && Number.isSafeInteger(p.reachedAmount) && p.reachedAmount === order.amount;
}

/** Row locks and a paid marker make repeated or concurrent callbacks a no-op. */
export async function confirmKonnectPayment(reference: string) {
  if (!isKonnectReference(reference)) throw new Error('Invalid payment reference.');
  const [order] = await db.select().from(konnectPayments).where(eq(konnectPayments.paymentRef, reference));
  if (!order || order.mode !== env.KONNECT_MODE || !env.KONNECT_API_KEY || !env.KONNECT_WALLET_ID) return false;
  if (order.mode === 'sandbox' && env.isProd) return false;
  if (order.status === 'paid') return true;
  if (!['pending', 'expired'].includes(order.status)) return false;
  const { payment } = await request(`/payments/${encodeURIComponent(reference)}`);
  if (!verifiedKonnectPayment(payment, order, env.KONNECT_WALLET_ID)) return false;
  return db.transaction(async tx => {
    const [locked] = await tx.select().from(konnectPayments).where(eq(konnectPayments.id, order.id)).for('update');
    if (!locked || locked.status === 'paid') return locked?.status === 'paid';
    if (!['pending', 'expired'].includes(locked.status)) return false;
    if (locked.userId !== null) {
      const [user] = await tx.select().from(users).where(eq(users.id, locked.userId)).for('update');
      if (user) {
        if (user.stripeSubscriptionId) throw new Error('Existing Stripe subscription requires reconciliation.');
        const source = `konnect:${locked.mode}`;
        const now = new Date();
        const active = user.plan === 'pro' && user.subscriptionEndsAt && user.subscriptionEndsAt > now;
        // Sandbox cannot extend or replace existing real/administrative access.
        if (locked.mode !== 'sandbox' || !active || user.premiumSource === source) {
          const start = user.premiumSource === source && active ? user.subscriptionEndsAt! : now;
          await tx.update(users).set({ plan: 'pro', premiumSource: source, subscriptionEndsAt: addPremiumMonth(start) }).where(eq(users.id, user.id));
        }
      }
    }
    await tx.update(konnectPayments).set({ status: 'paid', paidAt: new Date() }).where(eq(konnectPayments.id, order.id));
    return true;
  });
}
