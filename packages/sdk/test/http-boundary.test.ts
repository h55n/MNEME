import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { type AddressInfo } from 'node:net';
import { createMnemeClient } from '../src/index.js';

let server: Server;
let baseUrl: string;
let body: unknown = { success: true, data: {} };
let status = 200;
let requestedPath = '';
let requestCount = 0;
let slowBody = false;
beforeAll(async () => {
  server = createServer((request, response) => {
    requestCount++;
    requestedPath = request.url!;
    response.writeHead(status, { 'Content-Type': 'application/json' });
    if (slowBody) {
      response.flushHeaders();
      return;
    }
    response.end(JSON.stringify(body));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});
const client = (extra = {}) => createMnemeClient({ apiKey: 'local-test-key', vaultId: 'vault/id', baseUrl, ...extra });

describe('SDK real HTTP response boundary', () => {
  it.each([null, [], 'invalid', 1, { success: 'true', data: {} }, { success: true }])(
    'rejects malformed response envelopes as BAD_RESPONSE: %j', async value => {
      body = value; status = 200;
      await expect(client().vault.get()).rejects.toMatchObject({ code: 'BAD_RESPONSE', statusCode: 200 });
    });
  it('keeps a structured API error and status', async () => {
    body = { success: false, error: { code: 'NOT_FOUND', message: 'Vault not found' } }; status = 404;
    await expect(client().vault.get()).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'Vault not found', statusCode: 404 });
  });
  it('rejects malformed error fields instead of leaking a non-string Error message', async () => {
    body = { success: false, error: { code: 42, message: { private: 'payload' } } }; status = 500;
    await expect(client().vault.get()).rejects.toMatchObject({ code: 'UNKNOWN_ERROR', message: 'Request failed', statusCode: 500 });
  });
  it('normalizes trailing base slashes and encodes the vault path segment', async () => {
    body = { success: true, data: { id: 'vault/id' } }; status = 200;
    await expect(client({ baseUrl: baseUrl + '/' }).vault.get()).resolves.toEqual({ id: 'vault/id' });
    expect(requestedPath).toBe('/v1/vaults/vault%2Fid');
  });
  it('encodes pack and ingest identifiers as path segments', async () => {
    body = { success: true, data: {} }; status = 200;
    const c = client();
    await c.market.get('pack/id?#');
    expect(requestedPath).toBe('/v1/market/packs/pack%2Fid%3F%23');
    await c.market.purchase('pack/id', { buyerAddress: 'local', monadTxHash: 'fixture' });
    expect(requestedPath).toBe('/v1/market/packs/pack%2Fid/purchase');
    await c.market.ingest('vault/id', 'pack/id');
    expect(requestedPath).toBe('/v1/vaults/vault%2Fid/ingest/pack%2Fid');
  });
  it('keeps a response-body timeout classified as TIMEOUT', async () => {
    slowBody = true;
    try {
      await expect(client({ timeout: 30 }).vault.get()).rejects.toMatchObject({ code: 'TIMEOUT' });
    } finally {
      slowBody = false;
    }
  });
  it.each([0, -1, NaN, Infinity, 2_147_483_648])('rejects invalid timeout %s before any request', timeout => {
    const before = requestCount;
    expect(() => client({ timeout })).toThrow(/timeout/i);
    expect(requestCount).toBe(before);
  });
});
