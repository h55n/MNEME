const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const config = { apiUrl: 'https://api.example.test/v1/', apiKey: 'test-key', vaultId: 'v/a', budgetTokens: 99 };
function load(overrides = {}, response = { success: true, data: { memories: [{ type: 'semantic', content: 'Pune' }] } }) {
  let listener;
  const requests = [];
  const context = {
    chrome: {
      runtime: { onMessage: { addListener: f => { listener = f; } } },
      storage: { local: { get: async () => ({ ...config, ...overrides }) } },
      permissions: { contains: async () => true }
    },
    URL, AbortController, setTimeout, clearTimeout,
    fetch: async (...args) => { requests.push(args); return { ok: true, json: async () => response }; }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(`${__dirname}/../src/background.js`, 'utf8'), context);
  return { context, requests, listener, recall: query => context.handleFetchContext(query) };
}

test('real listener responds asynchronously and sends encoded authenticated recall', async () => {
  const m = load();
  let resolve;
  const result = new Promise(r => { resolve = r; });
  assert.equal(m.listener({ action: 'fetchMnemeContext', query: 'home?' }, {}, resolve), true);
  assert.equal((await result).context, '[SEMANTIC] Pune');
  const [url, opts] = m.requests[0];
  assert.equal(url, 'https://api.example.test/v1/vaults/v%2Fa/memories/recall');
  assert.equal(opts.headers.Authorization, 'Bearer test-key');
  assert.equal(opts.redirect, 'error');
  assert.deepEqual(JSON.parse(opts.body), { query: 'home?', budget_tokens: 99, task_scope: 'chat_session' });
  assert.equal(m.listener({ action: 'other' }, {}, () => {}), false);
});

test('rejects unsafe/missing endpoint, credentials and invalid inputs without network', async () => {
  for (const fields of [{ apiUrl: '' }, { apiKey: '' }, { vaultId: '' },
    { apiUrl: 'http://public.test/v1' }, { apiUrl: 'https://user:pass@api.test' },
    { apiUrl: 'https://api.test?key=secret' }, { budgetTokens: -1 }]) {
    const m = load(fields);
    await assert.rejects(m.recall('x'));
    assert.equal(m.requests.length, 0);
  }
  for (const query of ['', {}, 'x'.repeat(1001)]) await assert.rejects(load().recall(query));
});

test('permissions required; loopback development allowed', async () => {
  const m = load();
  m.context.chrome.permissions.contains = async () => false;
  await assert.rejects(m.recall('x'));
  assert.equal(m.requests.length, 0);
  assert.equal(await load({ apiUrl: 'http://localhost:3001/v1' }).recall('x'), '[SEMANTIC] Pune');
});

test('empty/malformed/API failure responses handled', async () => {
  assert.equal(await load({}, { success: true, data: { memories: [] } }).recall('x'), 'No relevant memories found.');
  for (const response of [{ success: false }, { success: true, data: {} },
    { success: true, data: { memories: ['wrong format'] } }]) {
    await assert.rejects(load({}, response).recall('x'));
  }
  const m = load();
  m.context.fetch = async () => ({ ok: false, status: 403 });
  await assert.rejects(m.recall('x'), /403/);
});

test('listener does not leak raw server response to third-party page', async () => {
  const m = load();
  m.context.fetch = async () => { throw new Error('private diagnostic/key'); };
  const result = await new Promise(resolve => m.listener({ action: 'fetchMnemeContext', query: 'x' }, {}, resolve));
  assert.equal(result.success, false);
  assert.ok(!result.error.includes('private'));
});
