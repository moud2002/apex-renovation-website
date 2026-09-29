import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

// Exercise the real bundled inbox handlers without a network or browser dependency.
// Full page/layout checks are covered separately by the built-site and UI checks.
const script = buildSync({
  entryPoints: [new URL('../src/scripts/inbox.ts', import.meta.url).pathname],
  bundle: true, write: false, format: 'iife', platform: 'browser',
}).outputFiles[0].text;

class Element {
  hidden = false;
  disabled = false;
  value = '';
  textContent = '';
  children = [];
  handlers = new Map();
  addEventListener(type, handler) { this.handlers.set(type, handler); }
  async trigger(type) { await this.handlers.get(type)?.({ preventDefault() {} }); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute() {}
  reset() {}
  querySelector() { return this.button; }
}

const row = {
  id: 1, reference: 'APX-SYNTHETIC-TEST', name: 'Synthetic QA inquiry',
  createdAt: '2026-09-29T12:00:00.000Z', status: 'new', projectType: 'Whole-home rehab',
  city: 'Test city', budget: '', timeline: '', email: 'qa@example.test', phone: '',
  details: 'Synthetic test only',
};
const payload = { inquiries: [row], counts: { new: 1, contacted: 0, closed: 0, total: 1 } };
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });

function fixture() {
  const elements = Object.fromEntries(['login', 'workspace', 'error', 'filter', 'list', 'counts', 'refresh', 'logout']
    .map(name => [name, new Element()]));
  elements.login.button = new Element();
  elements.workspace.hidden = true;
  elements.error.hidden = true;
  elements.filter.value = 'all';
  const navigation = [];
  let handler = async path => {
    if (path === '/api/admin/login') return response({ token: 'a'.repeat(43) });
    if (path === '/api/admin/inquiries') return response(payload);
    return response({ ok: true });
  };
  new Function('document', 'window', 'fetch', 'FormData', script)(
    {
      querySelector: selector => elements[selector.match(/^\[data-inbox-(.+)\]$/)?.[1]],
      createElement: () => new Element(),
    },
    { location: { assign: path => navigation.push(path) } },
    (path, options) => handler(path, options),
    class { get(key) { return key === 'username' ? 'synthetic-owner' : 'synthetic-password'; } },
  );
  return { elements, navigation, setHandler: next => { handler = next; } };
}

test('expired inbox authentication clears private data and restores sign-in', async () => {
  const f = fixture();
  await f.elements.login.trigger('submit');
  assert.equal(f.elements.workspace.hidden, false);
  assert.equal(f.elements.list.children.length, 1);
  f.setHandler(async () => response({ message: 'Please sign in to the website inbox.' }, 401));
  await f.elements.refresh.trigger('click');
  assert.equal(f.elements.login.hidden, false);
  assert.equal(f.elements.workspace.hidden, true);
  assert.equal(f.elements.list.children.length, 0);
  assert.equal(f.elements.counts.children.length, 0);
  assert.equal(f.elements.error.textContent, 'Please sign in to the website inbox.');
});

test('sign-out clears data immediately and a delayed inbox response cannot restore it', async () => {
  const f = fixture();
  await f.elements.login.trigger('submit');
  let finishRefresh, finishLogout;
  f.setHandler((path, options) => {
    if (path === '/api/admin/inquiries') return new Promise(resolve => { finishRefresh = resolve; });
    assert.equal(path, '/api/admin/logout');
    assert.equal(options.headers.Authorization, `Bearer ${'a'.repeat(43)}`);
    return new Promise(resolve => { finishLogout = resolve; });
  });
  const refresh = f.elements.refresh.trigger('click');
  const logout = f.elements.logout.trigger('click');
  assert.equal(f.elements.workspace.hidden, true);
  assert.equal(f.elements.list.children.length, 0);
  finishRefresh(response(payload));
  await refresh;
  assert.equal(f.elements.list.children.length, 0);
  assert.equal(f.elements.counts.children.length, 0);
  finishLogout(response({ ok: true }));
  await logout;
  assert.deepEqual(f.navigation, ['/settings/']);
});

test('expired Settings access returns the owner to the passcode page', async () => {
  const f = fixture();
  f.setHandler(async () => response({ message: 'Enter your Settings passcode first.', settingsRequired: true }, 403));
  await f.elements.login.trigger('submit');
  assert.equal(f.elements.workspace.hidden, true);
  assert.equal(f.elements.list.children.length, 0);
  assert.deepEqual(f.navigation, ['/settings/']);
});
