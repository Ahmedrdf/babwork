const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { messages } = require('../src/i18n/messages.ts');

function actions({ mailEnabled = true, fail = false, verified = false, allowed = true } = {}) {
  const calls = [];
  const user = { id: 7, email: 'fixture@example.com', emailVerifiedAt: verified ? new Date() : null };
  const dependencies = {
    'next/navigation': { redirect(location) { throw Object.assign(new Error('redirect'), { location }); } },
    'drizzle-orm': { eq() {} }, zod: require('zod'), '@/db': { users: {}, db: { select: () => ({ from: () => ({ where: async () => [] }) }) } },
    '@/lib/auth': {
      clientIp: async () => 'fixture', createUser: async () => { calls.push('create'); return user; },
      issueToken: async () => { calls.push('token'); return 'synthetic'; }, createSession: async id => { calls.push(`session:${id}`); },
      getCurrentUser: async () => user,
    },
    '@/lib/rate-limit': { rateLimit: async () => allowed },
    '@/lib/mail': { sendMail: async () => { calls.push('send'); if (fail) throw Error('Simulated provider outage'); } },
    '@/i18n/server': { getT: async () => messages.fr }, '@/lib/env': { env: { mailEnabled, APP_URL: 'https://babwork.test' } },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/actions/auth.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, URLSearchParams, console: { error() {} }, require(name) { if (!(name in dependencies)) throw Error(name); return dependencies[name]; } });
  return { ...exports, calls, user };
}

test('registration survives a confirmation-provider outage and does not verify the email', async () => {
  for (const options of [{ fail: true }, { mailEnabled: false }, { fail: false }]) {
    const auth = actions(options);
    const form = new FormData(); form.set('email', 'fixture@example.com'); form.set('password', 'fixture-password'); form.set('confirmPassword', 'fixture-password'); form.set('next', '/recommendations');
    await assert.rejects(auth.register(undefined, form), error => {
      const url = new URL(error.location, 'https://babwork.test');
      assert.equal(url.pathname, '/profile'); assert.equal(url.searchParams.get('welcome'), '1');
      assert.equal(url.searchParams.get('next'), '/recommendations');
      assert.equal(url.searchParams.get('verification'), options.fail || options.mailEnabled === false ? 'pending' : null);
      return true;
    });
    assert.equal(auth.user.emailVerifiedAt, null);
    assert.equal(auth.calls.filter(c => c === 'create').length, 1);
    assert.equal(auth.calls.at(-1), 'session:7');
    assert.equal(auth.calls.includes('send'), options.mailEnabled !== false);
  }
});

test('resending reports mail errors without an error boundary or false success', async () => {
  for (const options of [{ fail: true }, { mailEnabled: false }, { fail: false }, { verified: true }, { allowed: false }]) {
    const auth = actions(options);
    const result = await auth.resendVerification();
    if (options.verified) { assert.equal(result, undefined); assert.equal(auth.calls.length, 0); }
    else if (options.fail || options.mailEnabled === false) { assert.equal(result.error, messages.fr.errors.verifyUnavailable); assert.equal(result.ok, undefined); }
    else if (options.allowed === false) { assert.equal(result.error, messages.fr.errors.tooManyRequests); assert.equal(auth.calls.length, 0); }
    else assert.equal(result.ok, messages.fr.errors.verifySent);
  }
});
