import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import Database from 'better-sqlite3';
import { createApp, PROJECT_ROOT } from '../server/app.mjs';
import { rotatePassword } from '../server/store.mjs';

const receipt = 'Your project inquiry has been received.';
const lead = (overrides = {}) => ({
  name: 'Test homeowner',
  email: 'homeowner@example.test',
  phone: '',
  city: 'Naperville',
  projectType: 'Kitchen renovation',
  budget: 'Discuss options',
  timeline: 'Planning ahead',
  details: 'Test inquiry only. Please discuss the renovation scope.',
  consent: true,
  website: '',
  submissionId: randomUUID(),
  ...overrides,
});
const generousLimits = { inquiries: 1000, globalInquiries: 10000, login: 1000, loginAccount: 1000, globalLogin: 10000 };

async function fixture(t, overrides = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'apex-website-backend-'));
  const distDir = path.join(root, 'dist');
  const dataDir = path.join(root, 'private', 'data');
  const credentialsPath = path.join(root, 'private', 'Website Inbox Access.md');
  mkdirSync(path.join(distDir, 'services', 'kitchens'), { recursive: true });
  mkdirSync(path.join(distDir, 'inbox'), { recursive: true });
  mkdirSync(path.join(distDir, 'assets'), { recursive: true });
  mkdirSync(path.join(distDir, 'data'), { recursive: true });
  mkdirSync(path.join(distDir, 'server'), { recursive: true });
  mkdirSync(path.join(root, 'external'), { recursive: true });
  writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><title>Home fixture</title><h1>Home fixture</h1>');
  writeFileSync(path.join(distDir, 'services', 'kitchens', 'index.html'), '<!doctype html><title>Kitchen fixture</title><h1>Kitchen fixture</h1>');
  writeFileSync(path.join(distDir, 'inbox', 'index.html'), '<!doctype html><title>Inbox fixture</title><h1>Inbox fixture</h1>');
  writeFileSync(path.join(distDir, '404.html'), '<!doctype html><title>Missing fixture</title><h1>Missing fixture</h1>');
  writeFileSync(path.join(distDir, 'assets', 'app.js'), 'console.log("public fixture");');
  writeFileSync(path.join(distDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  writeFileSync(path.join(distDir, 'package.json'), '{"private": "never expose"}');
  writeFileSync(path.join(distDir, '.env'), 'PRIVATE_FIXTURE=never-expose');
  writeFileSync(path.join(distDir, 'website-inbox.sqlite3'), 'private database fixture');
  writeFileSync(path.join(distDir, 'Website Inbox Access.md'), 'private credentials fixture');
  writeFileSync(path.join(distDir, 'data', 'secrets.js'), 'private data fixture');
  writeFileSync(path.join(distDir, 'server', 'app.mjs'), 'private server fixture');
  writeFileSync(path.join(distDir, 'assets', 'app.js.map'), '{"sourcesContent":["private source fixture"]}');
  writeFileSync(path.join(root, 'external', 'secrets.js'), 'private external fixture');
  symlinkSync(path.join(root, 'external', 'secrets.js'), path.join(distDir, 'leaked.js'));
  symlinkSync(path.join(root, 'external'), path.join(distDir, 'leaked-directory'));
  const config = {
    distDir, dataDir, credentialsPath,
    adminUsername: 'mahmoud',
    // Generate test secrets at runtime; there are no reusable credentials in the source.
    adminPassword: randomBytes(24).toString('base64url'),
    previewNoindex: true,
    allowOpaqueOrigin: true,
    allowedOrigins: [],
    trustProxy: false,
    limits: generousLimits,
    ...overrides,
  };
  let backend;
  let server;
  let base;
  async function start(extra = {}) {
    backend = await createApp({ ...config, ...extra });
    server = await new Promise((resolve) => {
      const listener = backend.app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    base = `http://127.0.0.1:${server.address().port}`;
  }
  async function stop() {
    if (server?.listening) await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
    backend?.close();
  }
  await start();
  t.after(stop);
  // Deliberately retain isolated temporary fixtures for review; no workspace files are deleted.
  return {
    config,
    root,
    get base() { return base; },
    get store() { return backend.store; },
    async restart(extra = {}) { await stop(); await start(extra); },
    stop,
    async request(route, { method = 'GET', body, token, headers = {}, raw, redirect = 'manual' } = {}) {
      const response = await fetch(`${base}${route}`, {
        method,
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        ...(body !== undefined || raw !== undefined ? { body: raw ?? JSON.stringify(body) } : {}),
        redirect,
      });
      const text = await response.text();
      let json;
      try { json = JSON.parse(text); } catch { /* A static HTML response is expected in some tests. */ }
      return { response, status: response.status, headers: response.headers, text, json };
    },
    async login(password = config.adminPassword, username = config.adminUsername) {
      return this.request('/api/admin/login', { method: 'POST', body: { username, password } });
    },
  };
}

test('bootstrap creates private random credentials and salted password storage', async (t) => {
  const f = await fixture(t, { adminPassword: undefined });
  const access = readFileSync(f.config.credentialsPath, 'utf8');
  const password = access.match(/```text\n([^\n]+)\n```/)?.[1];
  assert.match(password, /^[A-Za-z0-9_-]{32}$/);
  assert.match(access, /Username: `mahmoud`/);
  assert.match(access, /not a production hosting or durability guarantee/);
  assert.equal(statSync(f.config.credentialsPath).mode & 0o777, 0o600);
  assert.equal(statSync(f.store.databasePath).mode & 0o777, 0o600);
  assert.equal(statSync(f.config.dataDir).mode & 0o777, 0o700);
  const login = await f.login(password);
  assert.equal(login.status, 200);
  assert.match(login.json.token, /^[A-Za-z0-9_-]{43}$/);
  const db = new Database(f.store.databasePath, { readonly: true });
  try {
    const admin = db.prepare('SELECT * FROM admin_user').get();
    assert.match(admin.password_salt, /^[0-9a-f]{64}$/);
    assert.match(admin.password_hash, /^[0-9a-f]{128}$/);
    assert.notEqual(admin.password_hash, password);
    const session = db.prepare('SELECT * FROM admin_sessions').get();
    assert.match(session.token_hash, /^[0-9a-f]{64}$/);
    assert.ok(!JSON.stringify(session).includes(login.json.token));
    const columns = db.prepare('PRAGMA table_info(inquiries)').all().map((c) => c.name);
    assert.ok(!columns.some((c) => /(^ip$|ip_address|user_agent|payload|website|token|password)/i.test(c)));
  } finally { db.close(); }
});

test('public inquiry accepts email or phone, flexible fields, and stores only the intended data', async (t) => {
  const f = await fixture(t);
  const emailLead = lead({ name: '  Test homeowner  ', budget: 'A custom budget range', timeline: 'A custom schedule', details: 'First line\nSecond line' });
  const first = await f.request('/api/inquiries', { method: 'POST', body: emailLead });
  assert.equal(first.status, 201);
  assert.deepEqual(Object.keys(first.json).sort(), ['message', 'ok', 'reference']);
  assert.equal(first.json.ok, true);
  assert.equal(first.json.message, receipt);
  assert.match(first.json.reference, /^APX-\d{8}-[A-F0-9]{12}$/);
  const second = await f.request('/api/inquiries', {
    method: 'POST',
    body: lead({ email: '', phone: '+1 (630) 555-0199 ext 2', projectType: 'A custom renovation type' }),
  });
  assert.equal(second.status, 201);
  const login = await f.login();
  const list = await f.request('/api/admin/inquiries', { token: login.json.token });
  assert.equal(list.status, 200);
  assert.deepEqual(list.json.counts, { new: 2, contacted: 0, closed: 0, total: 2 });
  const stored = list.json.inquiries.find((row) => row.reference === first.json.reference);
  assert.equal(stored.name, 'Test homeowner');
  assert.equal(stored.details, 'First line\nSecond line');
  assert.equal(stored.consent, true);
  assert.equal(stored.status, 'new');
  assert.ok(!('website' in stored));
  assert.ok(!('submissionId' in stored));
  assert.ok(!('submission_hash' in stored));
  assert.ok(Number.isFinite(Date.parse(stored.createdAt)));
});

test('submission IDs are idempotent under concurrent retries and after restart', async (t) => {
  const f = await fixture(t);
  const body = lead();
  const responses = await Promise.all(Array.from({ length: 5 }, () => f.request('/api/inquiries', { method: 'POST', body })));
  assert.ok(responses.every((r) => r.status === 201));
  assert.equal(new Set(responses.map((r) => r.json.reference)).size, 1);
  const firstReference = responses[0].json.reference;
  const repeated = await f.request('/api/inquiries', { method: 'POST', body: { ...body, name: 'Do not overwrite' } });
  assert.equal(repeated.json.reference, firstReference);
  const originalAccess = readFileSync(f.config.credentialsPath, 'utf8');
  const session = (await f.login()).json.token;
  await f.restart({ adminUsername: 'ignored-new-name', adminPassword: randomBytes(24).toString('base64url') });
  assert.equal(readFileSync(f.config.credentialsPath, 'utf8'), originalAccess);
  const postRestart = await f.request('/api/inquiries', { method: 'POST', body });
  assert.equal(postRestart.json.reference, firstReference);
  const list = await f.request('/api/admin/inquiries', { token: session });
  assert.equal(list.status, 200);
  assert.equal(list.json.counts.total, 1);
  assert.equal(list.json.inquiries[0].name, body.name);
  assert.equal((await f.login()).status, 200);
});

test('inquiries without an idempotency key are accepted independently', async (t) => {
  const f = await fixture(t);
  const body = lead();
  delete body.submissionId;
  delete body.budget;
  delete body.timeline;
  delete body.website;
  const first = await f.request('/api/inquiries', { method: 'POST', body });
  const second = await f.request('/api/inquiries', { method: 'POST', body });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.notEqual(first.json.reference, second.json.reference);
  assert.equal(f.store.listInquiries().counts.total, 2);
});

test('validation rejects missing, invalid, overlong, or unexpected values without saving them', async (t) => {
  const f = await fixture(t);
  const cases = [
    [{ name: '' }, 'name'],
    [{ city: ' ' }, 'city'],
    [{ projectType: '' }, 'projectType'],
    [{ details: '' }, 'details'],
    [{ email: '', phone: '' }, 'email'],
    [{ email: 'not-an-email' }, 'email'],
    [{ email: '', phone: '123' }, 'phone'],
    [{ phone: '+1 630 INVALID' }, 'phone'],
    [{ name: null }, 'name'],
    [{ details: {} }, 'details'],
    [{ budget: 12345 }, 'budget'],
    [{ timeline: ['soon'] }, 'timeline'],
    [{ name: 'A'.repeat(121) }, 'name'],
    [{ details: 'A'.repeat(5001) }, 'details'],
    [{ name: 'Test\nname' }, 'name'],
    [{ details: 'text\u0000text' }, 'details'],
    [{ consent: false }, 'consent'],
    [{ consent: 'true' }, 'consent'],
    [{ submissionId: 'short' }, 'submissionId'],
    [{ submissionId: 'has whitespace' }, 'submissionId'],
    [{ website: {} }, 'website'],
  ];
  for (const [invalid, field] of cases) {
    const result = await f.request('/api/inquiries', { method: 'POST', body: lead(invalid) });
    assert.equal(result.status, 400, `Expected 400 for ${field}`);
    assert.equal(result.json.ok, false);
    assert.ok(result.json.fields[field], `Expected field error for ${field}`);
  }
  const unknown = await f.request('/api/inquiries', { method: 'POST', body: lead({ admin: true }) });
  assert.equal(unknown.status, 400);
  assert.equal(f.store.listInquiries().counts.total, 0);
});

test('malformed, compressed, oversized, wrong-type, and non-object bodies produce safe 400 errors', async (t) => {
  const f = await fixture(t);
  for (const raw of ['{bad json', '[]', 'null', '"text"', 'false', '{"details":"' + 'x'.repeat(17000) + '"}']) {
    const result = await f.request('/api/inquiries', { method: 'POST', raw, headers: { 'Content-Type': 'application/json' } });
    assert.equal(result.status, 400);
    assert.equal(result.json.ok, false);
    assert.ok(!result.text.includes('SyntaxError'));
    assert.ok(!result.text.includes('node_modules'));
    assert.ok(result.text.length < 300);
  }
  assert.equal((await f.request('/api/inquiries', { method: 'POST', raw: 'name=someone', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })).status, 400);
  assert.equal((await f.request('/api/inquiries', { method: 'POST' })).status, 400);
  const compressed = await f.request('/api/inquiries', {
    method: 'POST', raw: gzipSync(JSON.stringify(lead())),
    headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' },
  });
  assert.equal(compressed.status, 400);
  assert.equal(f.store.listInquiries().counts.total, 0);
});

test('honeypot produces a normal success without storing data or consuming a submission ID', async (t) => {
  const f = await fixture(t);
  const body = lead({ website: 'https://spam.example.test' });
  const trapped = await f.request('/api/inquiries', { method: 'POST', body });
  assert.equal(trapped.status, 201);
  assert.equal(trapped.json.message, receipt);
  assert.match(trapped.json.reference, /^APX-\d{8}-[A-F0-9]{12}$/);
  assert.equal(f.store.listInquiries().counts.total, 0);
  const minimalSpam = await f.request('/api/inquiries', { method: 'POST', body: { website: 'spam' } });
  assert.equal(minimalSpam.status, 201);
  const legitimate = await f.request('/api/inquiries', { method: 'POST', body: { ...body, website: '' } });
  assert.equal(legitimate.status, 201);
  assert.equal(f.store.listInquiries().counts.total, 1);
});

test('all private routes require bearer authentication and login failures are generic', async (t) => {
  const f = await fixture(t);
  for (const [route, method, body] of [
    ['/api/admin/inquiries', 'GET'],
    ['/api/admin/inquiries/1', 'PATCH', { status: 'closed' }],
    ['/api/admin/logout', 'POST'],
    ['/api/admin/unrecognized', 'GET'],
  ]) {
    const result = await f.request(route, { method, body });
    assert.equal(result.status, 401);
    assert.equal(result.headers.get('WWW-Authenticate'), 'Bearer');
  }
  for (const token of ['invalid', randomBytes(32).toString('base64url')]) {
    assert.equal((await f.request('/api/admin/inquiries', { token })).status, 401);
  }
  const wrongPassword = await f.login('a definitely wrong password');
  const wrongUsername = await f.login(f.config.adminPassword, 'does-not-exist');
  assert.equal(wrongPassword.status, 401);
  assert.deepEqual(wrongPassword.json, wrongUsername.json);
  assert.equal((await f.request('/api/admin/login', { method: 'POST', body: { username: 'mahmoud', password: 123 } })).status, 400);
  const login = await f.login();
  assert.equal(login.status, 200);
  assert.ok(Date.parse(login.json.expiresAt) > Date.now());
  assert.equal(login.headers.get('set-cookie'), null);
  assert.equal(login.headers.get('cache-control'), 'no-store');
  assert.equal((await f.request('/api/admin/inquiries', { headers: { Cookie: `token=${login.json.token}` } })).status, 401);
  assert.equal((await f.request(`/api/admin/inquiries?token=${login.json.token}`)).status, 401);
  assert.equal((await f.request('/api/inquiries')).status, 404);
  assert.equal((await f.request('/api/inquiries/1')).status, 404);
  assert.equal((await f.request('/api/admin/inquiries', { method: 'DELETE', token: login.json.token })).status, 404);
});

test('statuses update persistently and counts follow each transition', async (t) => {
  const f = await fixture(t);
  await f.request('/api/inquiries', { method: 'POST', body: lead() });
  const token = (await f.login()).json.token;
  const id = f.store.listInquiries().inquiries[0].id;
  for (const status of ['contacted', 'closed', 'new']) {
    const result = await f.request(`/api/admin/inquiries/${id}`, { method: 'PATCH', body: { status }, token });
    assert.equal(result.status, 200);
    assert.equal(result.json.ok, true);
    assert.equal(result.json.inquiry.status, status);
    const list = await f.request('/api/admin/inquiries', { token });
    assert.equal(list.json.counts[status], 1);
    assert.equal(list.json.counts.total, 1);
    assert.equal(list.json.counts.new + list.json.counts.contacted + list.json.counts.closed, 1);
  }
  for (const body of [{ status: 'deleted' }, { status: 'closed', details: 'cannot edit' }, {}, { status: null }]) {
    assert.equal((await f.request(`/api/admin/inquiries/${id}`, { method: 'PATCH', body, token })).status, 400);
  }
  for (const invalidId of ['0', 'abc', '1abc', '9007199254740992']) {
    assert.equal((await f.request(`/api/admin/inquiries/${invalidId}`, { method: 'PATCH', body: { status: 'closed' }, token })).status, 400);
  }
  assert.equal((await f.request('/api/admin/inquiries/999999', { method: 'PATCH', body: { status: 'closed' }, token })).status, 404);
  await f.request(`/api/admin/inquiries/${id}`, { method: 'PATCH', body: { status: 'contacted' }, token });
  await f.restart();
  assert.equal(f.store.listInquiries().inquiries[0].status, 'contacted');
});

test('logout revokes the session and absolute expiry is enforced', async (t) => {
  let now = Date.now();
  const f = await fixture(t, { now: () => now, sessionTtlMs: 1000 });
  const first = await f.login();
  const token = first.json.token;
  assert.equal((await f.request('/api/admin/inquiries', { token })).status, 200);
  assert.equal((await f.request('/api/admin/logout', { method: 'POST', token })).status, 200);
  assert.equal((await f.request('/api/admin/inquiries', { token })).status, 401);
  assert.equal((await f.request('/api/admin/logout', { method: 'POST', token })).status, 401);
  const second = (await f.login()).json.token;
  now += 1001;
  assert.equal((await f.request('/api/admin/inquiries', { token: second })).status, 401);
});

test('public health and security headers reveal no private information', async (t) => {
  const f = await fixture(t);
  const health = await f.request('/api/health');
  assert.equal(health.status, 200);
  assert.deepEqual(health.json, { ok: true });
  assert.equal(health.headers.get('x-powered-by'), null);
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  assert.match(health.headers.get('x-robots-tag'), /noindex/);
  assert.match(health.headers.get('content-security-policy'), /object-src 'none'/);
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.equal(health.headers.get('set-cookie'), null);
  assert.ok(!health.text.includes(f.config.dataDir));
  f.store.close();
  const failed = await f.request('/api/health');
  assert.equal(failed.status, 500);
  assert.equal(failed.json.ok, false);
  assert.ok(!/sqlite|database|closed|stack|\/home\//i.test(failed.text));
});

test('opaque preview and same-origin CORS work without cookies; disallowed origins remain blocked', async (t) => {
  const f = await fixture(t, { allowedOrigins: ['https://frontend.example.test'] });
  const preflight = await f.request('/api/admin/inquiries', {
    method: 'OPTIONS',
    headers: { Origin: 'null', 'Access-Control-Request-Method': 'PATCH', 'Access-Control-Request-Headers': 'content-type, authorization' },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'null');
  assert.equal(preflight.headers.get('access-control-allow-credentials'), null);
  assert.match(preflight.headers.get('access-control-allow-headers'), /Authorization/);
  assert.equal((await f.request('/api/admin/inquiries', { headers: { Origin: 'null' } })).status, 401);
  const submitted = await f.request('/api/inquiries', { method: 'POST', body: lead(), headers: { Origin: 'null' } });
  assert.equal(submitted.status, 201);
  for (const origin of [f.base, 'https://frontend.example.test']) {
    const result = await f.request('/api/health', { headers: { Origin: origin } });
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('access-control-allow-origin'), origin);
  }
  const denied = await f.request('/api/health', { headers: { Origin: 'https://untrusted.example.test' } });
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
  const forbiddenHeader = await f.request('/api/inquiries', {
    method: 'OPTIONS',
    headers: { Origin: 'null', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'x-unapproved-header' },
  });
  assert.equal(forbiddenHeader.status, 403);
});

test('production can disable preview indexing and opaque origins while inbox remains noindex', async (t) => {
  const f = await fixture(t, { previewNoindex: false, allowOpaqueOrigin: false });
  const home = await f.request('/');
  assert.equal(home.status, 200);
  assert.equal(home.headers.get('x-robots-tag'), null);
  assert.equal(home.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.match(home.headers.get('content-security-policy'), /frame-ancestors 'self'/);
  assert.match((await f.request('/inbox/')).headers.get('x-robots-tag'), /noindex/);
  assert.equal((await f.request('/api/health', { headers: { Origin: 'null' } })).status, 403);
});

test('static hosting supports clean routes, HEAD, true 404, and excludes private/source files', async (t) => {
  const f = await fixture(t, { requireBuild: true });
  const home = await f.request('/');
  assert.equal(home.status, 200);
  assert.match(home.text, /Home fixture/);
  assert.equal(home.headers.get('cache-control'), 'no-cache');
  const clean = await f.request('/services/kitchens?from=test');
  assert.equal(clean.status, 308);
  assert.equal(clean.headers.get('location'), '/services/kitchens/?from=test');
  assert.match((await f.request('/services/kitchens/')).text, /Kitchen fixture/);
  const head = await f.request('/services/kitchens/', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.text, '');
  assert.equal((await f.request('/inbox/')).headers.get('cache-control'), 'no-store');
  assert.equal((await f.request('/assets/app.js')).status, 200);
  assert.equal((await f.request('/robots.txt')).status, 200);
  for (const route of [
    '/does-not-exist/', '/services/not-built/', '/404', '/404/', '/404.html',
    '/server/app.mjs', '/package.json', '/.env', '/%2eenv',
    '/website-inbox.sqlite3', '/Website%20Inbox%20Access.md', '/data/secrets.js',
    '/assets/app.js.map', '/leaked.js', '/leaked-directory/secrets.js',
    '/node_modules/better-sqlite3/package.json', '/apex-website-private/data/website-inbox.sqlite3',
  ]) {
    const result = await f.request(route);
    assert.equal(result.status, 404, route);
    assert.match(result.text, /Missing fixture/);
    assert.ok(!/never.expose|private.*fixture/i.test(result.text), route);
  }
  assert.equal((await f.request('/%E0%A4%A')).status, 400);
  assert.equal((await f.request('/services/kitchens/', { method: 'POST' })).status, 404);
  assert.equal((await f.request('/api/not-a-route')).status, 404);
});

test('inquiry rate limiting counts attempts, ignores spoofed forwarding headers, and recovers after its window', async (t) => {
  let now = Date.now();
  const f = await fixture(t, { now: () => now, limits: { ...generousLimits, inquiries: 2, windowMs: 1000 } });
  for (let i = 0; i < 2; i++) {
    const result = await f.request('/api/inquiries', {
      method: 'POST', body: lead(), headers: { 'X-Forwarded-For': `192.0.2.${i + 1}`, 'X-Visitor-Id': `forged-${i}` },
    });
    assert.equal(result.status, 201);
  }
  const blocked = await f.request('/api/inquiries', { method: 'POST', body: lead(), headers: { 'X-Forwarded-For': '192.0.2.99' } });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get('retry-after'), '1');
  assert.equal(f.store.listInquiries().counts.total, 2);
  assert.equal((await f.request('/api/health')).status, 200);
  now += 1001;
  assert.equal((await f.request('/api/inquiries', { method: 'POST', body: lead() })).status, 201);
});

test('login attempts are rate limited before expensive password checks', async (t) => {
  const f = await fixture(t, { limits: { ...generousLimits, login: 2 } });
  assert.equal((await f.login('incorrect password one')).status, 401);
  assert.equal((await f.login('incorrect password two')).status, 401);
  const blocked = await f.login();
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  assert.ok(!blocked.text.includes('mahmoud'));
});

test('account limiting also applies across explicitly trusted proxy client addresses', async (t) => {
  const f = await fixture(t, { trustProxy: 1, limits: { ...generousLimits, loginAccount: 2 } });
  for (let i = 0; i < 3; i++) {
    const result = await f.request('/api/admin/login', {
      method: 'POST', body: { username: 'mahmoud', password: 'incorrect test password' },
      headers: { 'X-Forwarded-For': `192.0.2.${i + 1}` },
    });
    assert.equal(result.status, i < 2 ? 401 : 429);
  }
});

test('database and bootstrap paths cannot be inside the repository or public build', async (t) => {
  const f = await fixture(t);
  await assert.rejects(createApp({
    ...f.config,
    dataDir: path.join(PROJECT_ROOT, 'server', 'do-not-create-private-data'),
  }), /outside the website repository/);
  await assert.rejects(createApp({
    ...f.config,
    dataDir: path.join(f.config.distDir, 'do-not-create-private-data'),
  }), /outside the website repository/);
  const differentData = path.join(f.root, 'different-private-data');
  await assert.rejects(createApp({
    ...f.config,
    dataDir: differentData,
    credentialsPath: path.join(PROJECT_ROOT, 'server', 'do-not-create-password.md'),
  }), /outside the website repository/);
  const linked = path.join(f.root, 'link-to-public-build');
  symlinkSync(f.config.distDir, linked);
  await assert.rejects(createApp({ ...f.config, dataDir: path.join(linked, 'unsafe') }), /outside the website repository/);
});

test('local password rotation preserves inquiries and revokes all sessions', async (t) => {
  const f = await fixture(t);
  await f.request('/api/inquiries', { method: 'POST', body: lead() });
  const token = (await f.login()).json.token;
  await f.stop();
  const newPassword = randomBytes(24).toString('base64url');
  await rotatePassword({ ...f.config, projectRoot: PROJECT_ROOT, password: newPassword });
  assert.ok(readFileSync(f.config.credentialsPath, 'utf8').includes(newPassword));
  assert.equal(statSync(f.config.credentialsPath).mode & 0o777, 0o600);
  await f.restart();
  assert.equal((await f.login()).status, 401);
  assert.equal((await f.request('/api/admin/inquiries', { token })).status, 401);
  const newToken = (await f.login(newPassword)).json.token;
  const list = await f.request('/api/admin/inquiries', { token: newToken });
  assert.equal(list.status, 200);
  assert.equal(list.json.counts.total, 1);
});
