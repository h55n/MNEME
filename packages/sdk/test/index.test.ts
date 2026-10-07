import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMnemeClient, MnemeError } from '../src/index.js';

const VAULT = '11111111-1111-4111-8111-111111111111';
let fetchMock: ReturnType<typeof vi.fn>;

const reply = (body: unknown, status = 200) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
const client = (extra = {}) =>
  createMnemeClient({ apiKey: 'k-1', vaultId: VAULT, baseUrl: 'http://api.test/v1', operatorPublicKey: 'op', ...extra });

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('MnemeClient requests', () => {
  it('defaults to the local development API, never an unowned public domain', async () => {
    fetchMock.mockResolvedValue(reply({ success: true, data: {} }));
    await createMnemeClient({ apiKey: 'k', vaultId: VAULT }).vault.get();
    expect(fetchMock.mock.calls[0][0]).toBe(`http://localhost:3001/v1/vaults/${VAULT}`);
  });
  it('writes a memory to the right URL with auth headers and body', async () => {
    fetchMock.mockResolvedValue(reply({ success: true, data: { contentHash: 'h' } }));
    const out = await client().memories.write({ content: 'I live in Pune' } as any);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`http://api.test/v1/vaults/${VAULT}/memories`);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer k-1');
    expect(init.headers['X-Operator-Public-Key']).toBe('op');
    expect(JSON.parse(init.body)).toEqual({ content: 'I live in Pune' });
    expect(out).toEqual({ contentHash: 'h' });
  });

  it('omits the operator key header when not configured', async () => {
    fetchMock.mockResolvedValue(reply({ success: true, data: {} }));
    await client({ operatorPublicKey: undefined }).vault.get();
    expect(fetchMock.mock.calls[0][1].headers['X-Operator-Public-Key']).toBeUndefined();
  });

  it('recall, list and delete hit the expected routes', async () => {
    fetchMock.mockImplementation(async () => reply({ success: true, data: {} }));
    const c = client();
    await c.memories.recall({ query: 'where do I live' } as any);
    await c.memories.list(2, 5);
    await c.memories.delete('a/b');
    const calls = fetchMock.mock.calls.map(([u, i]) => `${i.method} ${u}`);
    expect(calls).toEqual([
      `POST http://api.test/v1/vaults/${VAULT}/memories/recall`,
      `GET http://api.test/v1/vaults/${VAULT}/memories?page=2&limit=5`,
      `DELETE http://api.test/v1/vaults/${VAULT}/memories/a%2Fb`,
    ]);
  });
});

describe('MnemeClient errors', () => {
  it('turns an API error into MnemeError with code and status', async () => {
    fetchMock.mockResolvedValue(reply({ success: false, error: { message: 'Vault not found', code: 'NOT_FOUND' } }, 404));
    const err = await client().vault.get().catch(e => e);
    expect(err).toBeInstanceOf(MnemeError);
    expect(err).toMatchObject({ message: 'Vault not found', code: 'NOT_FOUND', statusCode: 404 });
  });

  it('treats an HTTP error with a success body as an error', async () => {
    fetchMock.mockResolvedValue(reply({ success: true, data: {} }, 500));
    await expect(client().vault.get()).rejects.toMatchObject({ statusCode: 500 });
  });

  it('reports a non-JSON response clearly', async () => {
    fetchMock.mockResolvedValue(reply('<html>Bad gateway</html>', 502));
    await expect(client().vault.get()).rejects.toMatchObject({ code: 'BAD_RESPONSE', statusCode: 502 });
  });

  it('reports network failure', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(client().vault.get()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('times out a slow request', async () => {
    fetchMock.mockImplementation((_u: string, init: RequestInit) =>
      new Promise((_r, reject) => init.signal!.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))));
    await expect(client({ timeout: 20 }).vault.get()).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
});
