const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse, NextRequest } = require('next/server');
const { isPremiumPrice, isBillingMarket, isBillingOrigin } = require('../src/lib/premium.ts');
const { chunkCv, cosine, skillEvidence, rankMatches } = require('../src/lib/cv-matching.ts');

function load(file, mocks, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, Date, URL, console, process, ...globals, require(name) {
    if (!(name in mocks)) throw new Error('Unexpected dependency: ' + name);
    return mocks[name];
  } });
  return exports;
}

test('price validation refuses a different amount, currency, interval or usage type', () => {
  const price = { active: true, currency: 'eur', unit_amount: 900, recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' } };
  assert.equal(isPremiumPrice(price), true);
  for (const patch of [{ active: false }, { currency: 'usd' }, { unit_amount: 1500 }, { recurring: null },
    { recurring: { interval: 'year', interval_count: 1 } }, { recurring: { interval: 'month', interval_count: 2 } },
    { recurring: { interval: 'month', interval_count: 1, usage_type: 'metered' } }]) {
    assert.equal(isPremiumPrice({ ...price, ...patch }), false);
  }
});

test('matching includes later CV sections and produces evidence without substring false positives', () => {
  const cv = 'Skills React TypeScript C++ SQL. ' + 'Experience building applications. '.repeat(80) + 'Arabic français';
  assert.ok(chunkCv(cv).at(-1).includes('Arabic français'));
  const longCv = 'Earlier experience '.repeat(3000) + 'RareSpecialistSkill';
  assert.equal(chunkCv(longCv).length, 32);
  assert.ok(chunkCv(longCv).at(-1).includes('RareSpecialistSkill'));
  assert.equal(cosine([0, 0], [1, 2]), 0);
  assert.deepEqual(skillEvidence('React and C++, not a Java developer', ['React', 'C++', 'R', 'JavaScript', 'SQL']), {
    shared: ['React', 'C++'], check: ['R', 'JavaScript', 'SQL'],
  });
  const jobs = [1, 2].map(id => ({ id, tags: id === 1 ? ['React'] : ['Cooking'] }));
  const ranked = rankMatches(cv, [[1, 0]], jobs, [[1, 0], [0, 1]]);
  assert.deepEqual(ranked.map(r => r.id), [1]);
  assert.equal('probability' in ranked[0], false);
});

test('recommendation API refuses unauthenticated, free and expired accounts before querying jobs', async () => {
  for (const user of [null, { isPro: false }, { isPro: false, plan: 'pro', subscriptionEndsAt: new Date(0) }]) {
    const route = load('src/app/api/recommendations/jobs/route.ts', {
      'next/server': { NextResponse }, 'drizzle-orm': {}, '@/db': { db: { select() { throw new Error('Jobs must not be queried'); } } },
      '@/lib/auth': { getCurrentUser: async () => user }, '@/lib/jobs': {}, '@/lib/text': {},
      '@/lib/env': { env: { cvMatchingPreviewEnabled: false } },
    });
    const response = await route.GET(new NextRequest('https://babwork.test/api/recommendations/jobs'));
    assert.equal(response.status, user ? 403 : 401);
  }
});

test('free CV preview is enabled only by the explicit flag in development', () => {
  for (const mode of ['production', 'test', 'development', undefined]) {
    for (const flag of ['1', '0', undefined]) {
      const { env } = load('src/lib/env.ts', { './premium': require('../src/lib/premium.ts') }, { process: { env: { NODE_ENV: mode, CV_MATCHING_PREVIEW: flag } } });
      assert.equal(env.cvMatchingPreviewEnabled, mode === 'development' && flag === '1');
    }
  }
});

test('local preview allows signed-in free users to read matching jobs without changing their plan', async () => {
  for (const signedIn of [false, true]) {
    let reads = 0;
    const route = load('src/app/api/recommendations/jobs/route.ts', {
      'next/server': { NextResponse }, 'drizzle-orm': { eq() {}, desc() {}, and() {} },
      '@/db': { jobs: {}, db: { select: () => { reads++; return { from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [
        { id: 1, description: '<p>React developer</p>' },
      ] }) }) }) }; } } },
      '@/lib/auth': { getCurrentUser: async () => signedIn ? { id: 7, isPro: false } : null },
      '@/lib/jobs': { isRegion: () => false }, '@/lib/text': { plainText: text => text.replace(/<[^>]+>/g, '') },
      '@/lib/env': { env: { cvMatchingPreviewEnabled: true } },
    });
    const response = await route.GET(new NextRequest('https://babwork.test/api/recommendations/jobs'));
    assert.equal(response.status, signedIn ? 200 : 401);
    assert.equal(reads, signedIn ? 1 : 0);
    if (signedIn) {
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.equal((await response.json()).jobs[0].description, 'React developer');
    }
  }
});

function checkoutMocks({ user = { id: 7, email: 'test@example.com', stripeCustomerId: 'cus_7', isPro: false },
  enabled = true, preview = false, konnectReady = false, amount = 900, subscriptions = [] } = {}) {
  const created = [];
  const konnectCreated = [];
  const mocks = {
    'next/server': { NextResponse }, 'drizzle-orm': { eq() {} }, '@/db': {},
    '@/lib/auth': { getCurrentUser: async () => user },
    '@/lib/env': { env: { paymentsEnabled: enabled, konnectPaymentsEnabled: konnectReady, cvMatchingPreviewEnabled: preview, STRIPE_PRICE_ID: 'price_premium', APP_URL: 'https://babwork.test' } },
    '@/lib/premium': { isPremiumPrice, isBillingMarket, isBillingOrigin }, '@/lib/rate-limit': { rateLimit: async () => true },
    '@/lib/konnect': { createKonnectCheckout: async user => { konnectCreated.push(user); return 'https://sandbox.konnect.network/pay/test'; } },
    '@/i18n/server': { getLocale: async () => 'en' },
    '@/i18n/premium': { premiumMessages: { en: { accessError: 'access', unavailable: 'unavailable', already: 'already', checkoutError: 'checkout', preview: 'preview' } } },
    '@/lib/stripe': { stripe: {
      prices: { retrieve: async () => ({ id: 'price_premium', active: true, currency: 'eur', unit_amount: amount,
        recurring: { interval: 'month', interval_count: 1 } }) },
      subscriptions: { list: async () => ({ data: subscriptions }) },
      checkout: { sessions: { create: async (...args) => { created.push(args); return { url: 'https://checkout.stripe.com/c/pay/test' }; } } },
    } },
  };
  return { route: load('src/app/api/billing/checkout/route.ts', mocks), created, konnectCreated };
}
const checkoutRequest = origin => new NextRequest('https://babwork.test/api/billing/checkout', {
  method: 'POST', headers: { origin: origin || 'https://babwork.test' },
});

test('checkout enforces authentication, origin, configuration and one active subscription', async () => {
  for (const [options, origin, status] of [
    [{ user: null }, null, 401], [{}, 'https://other.test', 403], [{ enabled: false }, null, 503],
    [{ preview: true }, null, 409],
    [{ user: { isPro: true } }, null, 409],
    [{ subscriptions: [{ status: 'past_due', items: { data: [{ price: { id: 'price_premium' } }] } }] }, null, 409],
  ]) {
    const { route, created } = checkoutMocks(options);
    assert.equal((await route.POST(checkoutRequest(origin))).status, status);
    assert.equal(created.length, 0);
  }
});

test('checkout uses a server-selected monthly price and idempotency key', async () => {
  const { route, created } = checkoutMocks();
  const response = await route.POST(checkoutRequest());
  assert.equal(response.status, 200);
  assert.equal(created[0][0].mode, 'subscription');
  assert.equal(created[0][0].line_items[0].price, 'price_premium');
  assert.equal(created[0][0].customer, 'cus_7');
  assert.match(created[0][1].idempotencyKey, /^babwork-checkout-7-/);
});

test('Tunisia checkout selects Konnect, ignores client-supplied amounts and refuses missing setup', async () => {
  for (const ready of [false, true]) {
    const { route, created, konnectCreated } = checkoutMocks({ konnectReady: ready });
    const result = await route.POST(new NextRequest('https://babwork.test/api/billing/checkout', {
      method: 'POST', headers: { origin: 'https://babwork.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ market: 'TN', amount: 1, currency: 'EUR' }),
    }));
    assert.equal(result.status, ready ? 200 : 503); assert.equal(created.length, 0);
    assert.equal(konnectCreated.length, ready ? 1 : 0);
    if (ready) assert.equal('amount' in konnectCreated[0], false);
  }
});

test('subscription sync verifies product and owner, handles expiration, and ignores old cancellations', async () => {
  const future = Math.floor(Date.now() / 1000) + 86400;
  async function sync({ status = 'active', product = 'price_premium', owner = '7', current = 'sub_new', id = 'sub_new', end = future } = {}) {
    const changes = [];
    const route = load('src/lib/subscriptions.ts', {
      'server-only': {}, 'drizzle-orm': { eq() {} },
      '@/db': { users: {}, db: { select: () => ({ from: () => ({ where: async () => [{ id: 7, stripeSubscriptionId: current }] }) }),
        update: () => ({ set: value => ({ where: async () => changes.push(value) }) }) } },
      './env': { env: { STRIPE_PRICE_ID: 'price_premium' } },
      './stripe': { periodEnd: sub => new Date(sub.items.data[0].current_period_end * 1000),
        stripe: { subscriptions: { retrieve: async () => ({ id, status, customer: 'cus_7', metadata: { user_id: owner },
          items: { data: [{ price: { id: product }, current_period_end: end }] } }) } } },
    });
    return { active: await route.syncSubscription(id), changes };
  }
  assert.equal((await sync()).changes[0].plan, 'pro');
  assert.equal((await sync({ status: 'past_due' })).changes[0].plan, 'free');
  assert.equal((await sync({ end: 1 })).changes[0].plan, 'free');
  for (const options of [{ product: 'other' }, { owner: '99' }, { status: 'canceled', id: 'sub_old' }]) {
    assert.equal((await sync(options)).changes.length, 0);
  }
});

test('CV reader rejects unsupported/empty files and cleans up PDF workers after success or failure', async () => {
  let destroyed = 0, pages = 1;
  const cvText = 'React TypeScript frontend developer with experience building accessible websites.';
  const pdf = { GlobalWorkerOptions: {}, getDocument: () => ({ destroy: async () => destroyed++, promise: Promise.resolve({
    numPages: pages, getPage: async () => ({ getTextContent: async () => ({ items: [{ str: cvText }, { other: true }] }) }),
  }) }) };
  const { readCv } = load('src/lib/read-cv.ts', {
    'pdfjs-dist': pdf, 'mammoth/mammoth.browser': { extractRawText: async () => ({ value: cvText }) },
  });
  assert.equal(await readCv(new File([cvText], 'cv.txt')), cvText);
  assert.equal(await readCv(new File(['docx'], 'cv.docx')), cvText);
  assert.equal(await readCv(new File(['pdf'], 'cv.pdf')), cvText);
  assert.equal(destroyed, 1);
  pages = 31;
  await assert.rejects(readCv(new File(['pdf'], 'too-long.pdf')), /invalidFile/);
  assert.equal(destroyed, 2);
  await assert.rejects(readCv(new File([cvText], 'cv.doc')), /invalidFile/);
  await assert.rejects(readCv(new File([''], 'cv.txt')), /invalidFile/);
  await assert.rejects(readCv(new File(['short'], 'cv.txt')), /noText/);
});

test('payment callback cannot activate another customer or an unpaid checkout', async () => {
  for (const session of [
    { customer: 'cus_other', client_reference_id: '7', payment_status: 'paid' },
    { customer: 'cus_7', client_reference_id: '99', payment_status: 'paid' },
    { customer: 'cus_7', client_reference_id: '7', payment_status: 'unpaid' },
    { customer: 'cus_7', client_reference_id: '7', payment_status: 'paid' },
  ]) {
    let synced = 0;
    const route = load('src/app/api/billing/success/route.ts', {
      'next/server': { NextResponse }, '@/lib/auth': { getCurrentUser: async () => ({ id: 7, stripeCustomerId: 'cus_7' }) },
      '@/lib/env': { env: { APP_URL: 'https://babwork.test' } },
      '@/lib/stripe': { stripe: { checkout: { sessions: { retrieve: async () => ({ mode: 'subscription', subscription: 'sub_7', ...session }) } } } },
      '@/lib/subscriptions': { syncSubscription: async () => { synced++; return true; } },
    });
    const result = await route.GET(new NextRequest('https://babwork.test/api/billing/success?session_id=cs_test&next=//other.test'));
    const valid = session.customer === 'cus_7' && session.client_reference_id === '7' && session.payment_status === 'paid';
    assert.equal(synced, valid ? 1 : 0);
    assert.equal(result.headers.get('location'), 'https://babwork.test/' + (valid ? 'recommendations' : 'subscribe?pending=1'));
  }
});

test('webhook rejects invalid signatures before touching the database', async () => {
  const route = load('src/app/api/billing/webhook/route.ts', {
    'next/server': { NextResponse }, 'drizzle-orm': {}, '@/db': { db: new Proxy({}, { get() { throw new Error('Unexpected DB call'); } }) },
    '@/lib/env': { env: { STRIPE_WEBHOOK_SECRET: 'synthetic-secret' } }, '@/lib/subscriptions': {},
    '@/lib/stripe': { stripe: { webhooks: { constructEvent() { throw new Error('Invalid signature'); } } } },
  });
  const response = await route.POST(new NextRequest('https://babwork.test/api/billing/webhook', { method: 'POST', body: '{}' }));
  assert.equal(response.status, 400);
});

test('account deletion cancels billing first and stops if cancellation fails', async () => {
  for (const fail of [false, true]) {
    const calls = [];
    const route = load('src/actions/account.ts', {
      'next/navigation': { redirect: () => { throw new Error('redirect'); } }, 'next/cache': {}, 'drizzle-orm': { eq() {} },
      '@/db': { users: {}, profiles: {}, db: {
        select: () => ({ from: () => ({ where: async () => [] }) }),
        delete: () => ({ where: async () => { calls.push('delete'); } }),
      } },
      '@/lib/auth': { getCurrentUser: async () => ({ id: 7, stripeCustomerId: 'cus_7', stripeSubscriptionId: 'sub_7' }),
        destroySession: async () => calls.push('session') },
      '@/lib/storage': {}, '@/lib/mail': {}, '@/lib/rate-limit': {}, '@/i18n/server': {},
      '@/lib/stripe': { stripe: { subscriptions: {
        retrieve: async () => ({ id: 'sub_7', customer: 'cus_7', status: 'active' }),
        cancel: async () => { calls.push('cancel'); if (fail) throw new Error('cancel failed'); },
      } } },
    });
    await assert.rejects(route.deleteAccount(), fail ? /cancel failed/ : /redirect/);
    assert.deepEqual(calls, fail ? ['cancel'] : ['cancel', 'session', 'delete']);
  }
});
