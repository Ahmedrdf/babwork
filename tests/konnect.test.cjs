const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const orm = require('drizzle-orm');
const schema = require('../src/db/schema.ts');
const premium = require('../src/lib/premium.ts');

function load(file, mocks, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Date, URL, console, AbortSignal, ...globals, require(name) {
    if (!(name in mocks)) throw Error('Unexpected dependency: ' + name);
    return mocks[name];
  } });
  return exports;
}

test('TND uses millimes, correct displayed prices and strict hosted checkout origins', () => {
  assert.equal(premium.PREMIUM_TUNISIA.amount, 9900);
  assert.equal(premium.premiumPrice('TN', 'fr'), '9,900 DT');
  assert.ok(!premium.premiumPrice('TN', 'en').includes('€'));
  assert.equal(premium.isCheckoutUrl('https://gateway.sandbox.konnect.network/pay?payment_ref=test', 'TN'), true);
  for (const url of ['http://konnect.network/pay', 'https://konnect.network.evil.test/pay', 'https://evilkonnect.network/pay',
    'https://user:pass@konnect.network/pay', 'https://checkout.stripe.com/pay']) assert.equal(premium.isCheckoutUrl(url, 'TN'), false);
  assert.equal(premium.isCheckoutUrl('https://checkout.stripe.com/c/pay/test', 'INTL'), true);
});

test('calendar-month access handles short months and leap years', () => {
  assert.equal(premium.addPremiumMonth(new Date('2026-01-31T12:30:00Z')).toISOString(), '2026-02-28T12:30:00.000Z');
  assert.equal(premium.addPremiumMonth(new Date('2028-01-31T12:30:00Z')).toISOString(), '2028-02-29T12:30:00.000Z');
  assert.equal(premium.addPremiumMonth(new Date('2026-12-15T12:30:00Z')).toISOString(), '2027-01-15T12:30:00.000Z');
});

test('callbacks require public HTTPS setup and checkout origins handle LAN or HTTPS proxies safely', () => {
  assert.equal(premium.isPublicBillingUrl('https://babwork-demo.netlify.app'), true);
  for (const url of ['http://babwork.test', 'https://localhost', 'https://127.0.0.1', 'https://192.168.1.2', 'https://172.20.10.6', 'https://user:pass@babwork.test']) assert.equal(premium.isPublicBillingUrl(url), false);
  assert.equal(premium.isBillingOrigin('http://172.20.10.6:3000', 'http://localhost:3000/api/billing/checkout', '172.20.10.6:3000', 'http://localhost:3000'), true);
  assert.equal(premium.isBillingOrigin('https://demo.netlify.app', 'http://localhost/api', 'localhost', 'https://demo.netlify.app'), true);
  assert.equal(premium.isBillingOrigin('https://evil.test', 'https://babwork.test/api', 'babwork.test', 'https://babwork.test'), false);
  assert.equal(premium.isBillingOrigin(null, 'https://babwork.test/api', 'babwork.test', 'https://babwork.test'), false);
});

test('billing country is independent of interface language and supports an explicit choice', async () => {
  async function market(selected, saved, visitor) {
    const module = load('src/lib/billing-market.ts', {
      'server-only': {}, 'next/headers': { cookies: async () => ({ get: () => saved ? { value: saved } : undefined }) },
      './visitor': { getVisitor: async () => visitor }, '@/i18n/config': require('../src/i18n/config.ts'),
      './premium': premium, './env': { env: {} },
    }, { process: { env: { BILLING_DEFAULT_MARKET: 'TN' } } });
    return module.getBillingMarket(selected);
  }
  assert.equal(await market(undefined, undefined, { country: 'TN', tz: 'Europe/Paris' }), 'TN');
  assert.equal(await market(undefined, undefined, { country: 'FR', tz: 'Africa/Tunis' }), 'INTL');
  assert.equal(await market(undefined, undefined, { country: null, tz: 'Africa/Tunis' }), 'TN');
  assert.equal(await market(undefined, undefined, { country: null, tz: 'America/New_York' }), 'INTL');
  assert.equal(await market('TN', 'INTL', { country: 'FR' }), 'TN');
  assert.equal(await market(undefined, 'INTL', { country: 'TN' }), 'INTL');
  assert.equal(await market(undefined, undefined, { country: null, tz: null }), 'TN');
  const { getPremiumMessages, getDiscoveryMessages } = require('../src/i18n/billing.ts');
  for (const locale of ['en', 'fr', 'ar']) {
    const text = getPremiumMessages(locale, 'TN');
    assert.ok(!text.subscribe.includes('€')); assert.ok(!text.locked.includes('€'));
    assert.ok(!getDiscoveryMessages(locale, 'TN').priceNote.includes('€'));
  }
  assert.match(getPremiumMessages('fr', 'TN').cancelAnytime, /sans prélèvement automatique/);
});

test('Konnect sandbox receipts cannot unlock production access', () => {
  for (const production of [true, false]) {
    const auth = load('src/lib/auth.ts', {
      'server-only': {}, 'next/headers': {}, react: { cache: fn => fn }, crypto: require('node:crypto'),
      bcryptjs: {}, 'drizzle-orm': orm, '@/db': {}, '@/lib/env': { env: { isProd: production } },
    });
    const user = { plan: 'pro', subscriptionEndsAt: new Date(Date.now() + 86400000), premiumSource: 'konnect:sandbox' };
    assert.equal(auth.isPro(user), !production);
    assert.equal(auth.isPro({ ...user, premiumSource: 'konnect:live' }), true);
    assert.equal(auth.isPro({ ...user, subscriptionEndsAt: new Date(0) }), false);
  }
});

test('real SQL transactions prevent duplicate grants and validate Konnect payment evidence', async () => {
  const { PGlite } = require('@electric-sql/pglite');
  const { drizzle } = require('drizzle-orm/pglite');
  const client = new PGlite();
  await client.waitReady;
  const db = drizzle(client, { schema });
  try {
    for (const name of fs.readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort()) {
      for (const sql of fs.readFileSync('drizzle/' + name, 'utf8').split('--> statement-breakpoint').filter(s => s.trim())) await client.exec(sql);
    }
    await db.insert(schema.users).values([{ id: 1, email: 'fixture1@example.com', passwordHash: 'not-a-real-password' },
      { id: 2, email: 'fixture2@example.com', passwordHash: 'not-a-real-password' }]);
    const wallet = '1'.repeat(24);
    const env = { KONNECT_MODE: 'sandbox', KONNECT_API_KEY: 'synthetic-key', KONNECT_WALLET_ID: wallet,
      konnectPaymentsEnabled: true, isProd: false, APP_URL: 'https://babwork.test' };
    let calls = 0, initiated = 0, proof;
    const api = load('src/lib/konnect.ts', {
      'server-only': {}, 'node:crypto': require('node:crypto'), 'drizzle-orm': orm,
      '@/db': { db, ...schema }, './env': { env }, './premium': premium,
    }, { fetch: async (url, options) => {
      calls++;
      assert.ok(url.startsWith('https://api.sandbox.konnect.network/api/v2/payments/'));
      assert.equal(options.headers['x-api-key'], 'synthetic-key');
      if (options.method === 'POST') {
        initiated++;
        const body = JSON.parse(options.body);
        assert.equal(body.amount, 9900); assert.equal(body.token, 'TND'); assert.equal(body.addPaymentFeesToAmount, false);
        assert.equal(body.receiverWalletId, wallet);
        const reference = initiated.toString(16).padStart(24, '0');
        proof = { status: 'completed', orderId: body.orderId, token: 'TND', amountDue: 9900, reachedAmount: 9900, receiverWallet: { id: wallet } };
        return Response.json({ payUrl: 'https://gateway.sandbox.konnect.network/pay?payment_ref=' + reference, paymentRef: reference });
      }
      return Response.json({ payment: proof });
    } });
    const url = await api.createKonnectCheckout({ id: 1, stripeSubscriptionId: null });
    assert.equal(await api.createKonnectCheckout({ id: 1, stripeSubscriptionId: null }), url);
    assert.equal(initiated, 1);
    await assert.rejects(async () => db.insert(schema.konnectPayments).values({ id: 'duplicate-order', userId: 1, amount: 9900,
      currency: 'TND', mode: 'sandbox', expiresAt: new Date(Date.now() + 60000) }), error => error.cause?.code === '23505');
    const reference = new URL(url).searchParams.get('payment_ref');
    const original = { ...proof };
    for (const patch of [{ status: 'pending' }, { token: 'EUR' }, { orderId: 'someone-else' }, { amountDue: 990 },
      { reachedAmount: 9000 }, { receiverWallet: { id: 'other-wallet' } }]) {
      proof = { ...original, ...patch };
      assert.equal(await api.confirmKonnectPayment(reference), false);
      assert.equal((await db.select().from(schema.users).where(orm.eq(schema.users.id, 1)))[0].plan, 'free');
    }
    proof = original;
    await Promise.all([api.confirmKonnectPayment(reference), api.confirmKonnectPayment(reference), api.confirmKonnectPayment(reference)]);
    let [user] = await db.select().from(schema.users).where(orm.eq(schema.users.id, 1));
    assert.equal(user.plan, 'pro'); assert.equal(user.premiumSource, 'konnect:sandbox');
    const end = user.subscriptionEndsAt;
    await api.confirmKonnectPayment(reference);
    assert.equal((await db.select().from(schema.users).where(orm.eq(schema.users.id, 1)))[0].subscriptionEndsAt.toISOString(), end.toISOString());
    const renewal = await api.createKonnectCheckout({ id: 1, stripeSubscriptionId: null });
    await api.confirmKonnectPayment(new URL(renewal).searchParams.get('payment_ref'));
    [user] = await db.select().from(schema.users).where(orm.eq(schema.users.id, 1));
    assert.equal(user.subscriptionEndsAt.toISOString(), premium.addPremiumMonth(end).toISOString());
    env.isProd = true;
    const before = calls;
    assert.equal(await api.confirmKonnectPayment(reference), false); assert.equal(calls, before);
    env.isProd = false;
    await assert.rejects(api.createKonnectCheckout({ id: 2, stripeSubscriptionId: 'sub_existing' }), /existing Stripe/);
  } finally { await client.close(); }
});
