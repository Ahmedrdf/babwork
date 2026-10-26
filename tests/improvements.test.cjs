const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const orm = require('drizzle-orm');
const schema = require('../src/db/schema.ts');
const { PGlite } = require('@electric-sql/pglite');
const { drizzle } = require('drizzle-orm/pglite');
const { NextRequest, NextResponse } = require('next/server');
const tunisia = require('../src/lib/tunisia.ts');
const { isBillingOrigin } = require('../src/lib/premium.ts');

function load(file, mocks, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Date, URL, console, ...globals, require(name) {
    if (!(name in mocks)) throw Error('Unexpected dependency: ' + name);
    return mocks[name];
  } });
  return exports;
}

test('Tunisia filter excludes unspecified remote work and other country restrictions', () => {
  for (const value of ['Tunisia', 'Tunis, Tunisie', 'تونس', 'Worldwide', 'Anywhere', 'Global', 'Monde entier']) assert.equal(tunisia.mentionsTunisiaOrWorldwide(value), true, value);
  for (const value of ['Remote', 'EMEA', 'Europe', 'United States', 'Africa', 'GlobalCorp HQ', '']) assert.equal(tunisia.mentionsTunisiaOrWorldwide(value), false, value);
});

test('free launch is the production default and overrides payment flags without granting a paid plan', async () => {
  const configured = { NODE_ENV: 'production', CV_MATCHING_PREVIEW: '1', PAYMENTS_ENABLED: '1', PRICING_VISIBLE: '1',
    STRIPE_SECRET_KEY: 'synthetic', STRIPE_PRICE_ID: 'synthetic', STRIPE_WEBHOOK_SECRET: 'synthetic', KONNECT_MODE: 'live', KONNECT_API_KEY: 'synthetic', KONNECT_WALLET_ID: 'a'.repeat(24), APP_URL: 'https://babwork.test' };
  for (const FREE_LAUNCH of [undefined, '1', '0']) {
    const { env } = load('src/lib/env.ts', { './premium': require('../src/lib/premium.ts') }, { process: { env: { ...configured, FREE_LAUNCH } } });
    const free = FREE_LAUNCH !== '0';
    assert.equal(env.freeLaunchEnabled, free);
    assert.equal(env.cvMatchingPreviewEnabled, false, 'production access is not a development preview');
    assert.equal(env.paymentsEnabled, !free); assert.equal(env.konnectPaymentsEnabled, !free); assert.equal(env.pricingVisible, !free);
    if (!free) continue;
    const access = load('src/lib/matching-access.ts', { 'server-only': {}, 'node:crypto': require('node:crypto'), 'drizzle-orm': orm,
      '@/lib/env': { env }, '@/db': { ...schema, db: { select() { throw Error('Trial/subscription data must not be queried or changed'); } } } });
    assert.equal(await access.matchingAccess({ id: 1, isPro: false }), 'unlimited');
    const checkout = load('src/app/api/billing/checkout/route.ts', { 'next/server': { NextResponse }, 'drizzle-orm': orm,
      '@/db': {}, '@/lib/auth': { getCurrentUser: async () => ({ id: 1, isPro: false }) }, '@/lib/env': { env },
      '@/lib/stripe': { stripe: {} }, '@/lib/premium': require('../src/lib/premium.ts'), '@/lib/konnect': {}, '@/lib/rate-limit': {},
      '@/i18n/server': { getLocale: async () => 'fr' }, '@/i18n/premium': require('../src/i18n/premium.ts') });
    const response = await checkout.POST(new NextRequest('https://babwork.test/api/billing/checkout', { method: 'POST', headers: { origin: 'https://babwork.test' } }));
    assert.equal(response.status, 409, 'checkout creation is disabled during free launch');
  }
});

test('SQL-backed free trial, reports, feedback and persistent moderation enforce ownership and permissions', async () => {
  const client = new PGlite();
  await client.waitReady;
  const db = drizzle(client, { schema });
  const env = { APP_URL: 'https://babwork.test', cvMatchingPreviewEnabled: false };
  let user = { id: 1, isPro: false, isAdmin: false };
  const common = { 'drizzle-orm': orm, '@/db': { db, ...schema }, '@/lib/auth': { getCurrentUser: async () => user }, '@/lib/env': { env },
    '@/lib/premium': { isBillingOrigin }, '@/lib/rate-limit': { rateLimit: async () => true } };
  try {
    for (const name of fs.readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort()) {
      for (const statement of fs.readFileSync('drizzle/' + name, 'utf8').split('--> statement-breakpoint').filter(s => s.trim())) await client.exec(statement);
    }
    await db.insert(schema.users).values([1, 2].map(id => ({ id, email: `test-${id}@example.com`, passwordHash: 'synthetic' })));
    const job = { source: 'fixture', sourceId: '1', fingerprint: 'fixture|developer', title: 'Developer', company: 'Fixture', location: 'Tunisia', applyUrl: 'https://example.com/job', publishedAt: new Date(), tags: ['TypeScript'] };
    await db.insert(schema.jobs).values(job);
    const access = load('src/lib/matching-access.ts', { ...common, 'server-only': {}, 'node:crypto': require('node:crypto') });
    assert.equal(await access.matchingAccess(user), 'trial');
    const [a, b] = await Promise.all([access.startMatchingTrial(1), access.startMatchingTrial(1)]);
    assert.equal(a, b, 'simultaneous requests reuse one permit');
    assert.equal(await access.matchingAccess(user), 'trial', 'starting, failing or cancelling does not consume the trial');
    assert.equal(await access.finishMatchingTrial(2, a), false, 'permit belongs to its account');
    assert.equal(await access.finishMatchingTrial(1, 'wrong'), false);
    assert.equal(await access.finishMatchingTrial(1, a), true);
    assert.equal(await access.finishMatchingTrial(1, a), true, 'completion retry after a lost response is idempotent');
    assert.equal(await access.startMatchingTrial(1), null);
    assert.equal(await access.matchingAccess(user), 'locked');
    assert.equal(await access.matchingAccess({ ...user, isPro: true }), 'unlimited');
    await db.update(schema.matchingTrials).set({ completedAt: null, expiresAt: new Date(0) });
    assert.equal(await access.finishMatchingTrial(1, a), false, 'expired permits are rejected');
    const renewed = await access.startMatchingTrial(1);
    assert.notEqual(renewed, a);

    const session = load('src/app/api/recommendations/session/route.ts', { ...common, 'next/server': { NextRequest, NextResponse },
      '@/lib/jobs': { isRegion: require('../src/lib/regions.ts').isRegion, regionCondition: () => orm.sql`true` }, '@/lib/tunisia': tunisia,
      '@/lib/matching-access': access, '@/lib/text': { plainText: text => text } });
    const request = (body, origin = env.APP_URL) => new NextRequest(`${env.APP_URL}/api/recommendations/session`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await session.POST(request({}, 'https://evil.test'))).status, 403);
    user = null;
    assert.equal((await session.POST(request({}))).status, 401);
    user = { id: 1, isPro: false, isAdmin: false };
    const opened = await session.POST(request({ region: 'TN' }));
    assert.equal(opened.status, 200);
    const payload = await opened.json();
    assert.equal(payload.jobs.length, 1);
    assert.equal(payload.permit, renewed);
    assert.equal((await session.POST(request({ region: 'unknown' }))).status, 400);
    assert.equal((await session.POST(request({ complete: renewed }))).status, 200);
    assert.equal((await session.POST(request({}))).status, 403);
    env.freeLaunchEnabled = true;
    const freeSession = await session.POST(request({ region: 'TN' }));
    assert.equal(freeSession.status, 200, 'accounts with exhausted trials can use free launch');
    assert.equal((await freeSession.json()).permit, null, 'free access does not consume a trial');
    assert.equal((await db.select().from(schema.users).where(orm.eq(schema.users.id, 1)))[0].plan, 'free');
    const legacy = load('src/app/api/recommendations/jobs/route.ts', { ...common, 'next/server': { NextRequest, NextResponse },
      '@/lib/jobs': { isRegion: require('../src/lib/regions.ts').isRegion, regionCondition: () => orm.sql`true` }, '@/lib/text': { plainText: text => text } });
    assert.equal((await legacy.GET(new NextRequest('https://babwork.test/api/recommendations/jobs'))).status, 200);
    env.freeLaunchEnabled = false;
    user = { id: 2, isPro: true, isAdmin: false };
    assert.equal((await (await session.POST(request({}))).json()).permit, null);

    const community = load('src/app/api/community/route.ts', { ...common, 'next/server': { NextRequest, NextResponse } });
    const report = { kind: 'report', jobId: 1, reason: 'suspicious', note: 'Synthetic report' };
    assert.equal((await community.POST(request(report, 'https://evil.test'))).status, 403);
    user = null;
    assert.equal((await community.POST(request(report))).status, 401);
    user = { id: 1, isPro: false, isAdmin: false };
    assert.equal((await community.POST(request({ ...report, reason: 'arbitrary' }))).status, 400);
    assert.equal((await community.POST(request({ ...report, note: 'a'.repeat(501) }))).status, 400);
    assert.equal((await community.POST(request(report))).status, 200);
    assert.equal((await community.POST(request(report))).status, 200);
    assert.equal((await db.select().from(schema.jobReports)).length, 1, 'reports are deduplicated');
    for (const helpful of [true, false]) assert.equal((await community.POST(request({ kind: 'feedback', jobId: 1, helpful }))).status, 200);
    const feedback = await db.select().from(schema.recommendationFeedback);
    assert.equal(feedback.length, 1); assert.equal(feedback[0].helpful, false);
    const moderation = load('src/actions/moderation.ts', { ...common, 'next/cache': { revalidatePath() {} } });
    const form = new FormData(); form.set('jobId', '1'); form.set('reporterId', '1'); form.set('decision', 'deactivate');
    await assert.rejects(moderation.moderateReport(form), /Forbidden/);
    user.isAdmin = true;
    await moderation.moderateReport(form);
    assert.equal((await db.select().from(schema.jobs))[0].active, false);
    const ingest = load('src/ingest/run.ts', { ...common, 'sanitize-html': { default: require('sanitize-html') }, './sources': {}, './categories': { normalizeCategory: () => 'Engineering' }, './cleanup': {} });
    await ingest.upsertBatch([{ ...job, description: 'New feed refresh', tags: [], jobType: 'full_time' }]);
    const [refreshed] = await db.select().from(schema.jobs);
    assert.equal(refreshed.active, false, 'imports cannot reactivate a moderated listing');
    assert.equal(refreshed.moderationBlocked, true);
    await db.delete(schema.users).where(orm.eq(schema.users.id, 1));
    await ingest.upsertBatch([{ ...job, tags: [], jobType: 'full_time' }]);
    assert.equal((await db.select().from(schema.jobs))[0].active, false, 'deleting the reporter does not remove moderation');
  } finally { await client.close(); }
});
