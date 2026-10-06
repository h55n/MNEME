import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createMcpHttpServer } from '../src/http.js';

const VAULT = '11111111-1111-4111-8111-111111111111';
const upstream: { url: string; auth: string; body: any }[] = [];

let http: Server;
let base: string;

beforeAll(async () => {
  const fetchImpl = (async (url: string, init: RequestInit) => {
    upstream.push({ url, auth: (init.headers as any).Authorization, body: init.body ? JSON.parse(init.body as string) : undefined });
    return new Response(JSON.stringify({ success: true, data: { stored: true } }));
  }) as unknown as typeof fetch;
  http = createMcpHttpServer({ apiBase: 'http://api.test/v1', fetchImpl });
  await new Promise<void>(r => http.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>(r => http.close(() => r())));

const initBody = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } } };
const post = (path: string, headers: Record<string, string>, body: unknown = initBody) =>
  fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers }, body: JSON.stringify(body) });

describe('remote MCP over Streamable HTTP', () => {
  it('works with the official MCP HTTP client: list tools and write a memory', async () => {
    const client = new Client({ name: 'test', version: '1.0.0' }, { capabilities: {} });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
      requestInit: { headers: { Authorization: 'Bearer user-key', 'X-Mneme-Vault-Id': VAULT } },
    }));
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(7);
    await client.callTool({ name: 'memory_write', arguments: { content: 'remote hello' } });
    const last = upstream.at(-1)!;
    expect(last.url).toBe(`http://api.test/v1/vaults/${VAULT}/memories`);
    expect(last.auth).toBe('Bearer user-key');
    expect(last.body.content).toBe('remote hello');
    await client.close();
  });

  it('rejects a request with no bearer key', async () => {
    const r = await post('/mcp', { 'X-Mneme-Vault-Id': VAULT });
    expect(r.status).toBe(401);
  });

  it('rejects a missing or malformed vault id', async () => {
    expect((await post('/mcp', { Authorization: 'Bearer k' })).status).toBe(400);
    expect((await post('/mcp', { Authorization: 'Bearer k', 'X-Mneme-Vault-Id': '../../etc' })).status).toBe(400);
  });

  it('accepts the vault as a query parameter', async () => {
    const r = await post(`/mcp?vault=${VAULT}`, { Authorization: 'Bearer k' });
    expect(r.status).toBe(200);
  });

  it('refuses GET and DELETE (stateless, no sessions) and unknown paths', async () => {
    expect((await fetch(`${base}/mcp`, { method: 'GET' })).status).toBe(405);
    expect((await fetch(`${base}/mcp`, { method: 'DELETE' })).status).toBe(405);
    expect((await fetch(`${base}/other`)).status).toBe(404);
    expect((await fetch(`${base}/health`)).status).toBe(200);
  });

  it('rejects a non-JSON body', async () => {
    const r = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer k', 'X-Mneme-Vault-Id': VAULT }, body: 'nope' });
    expect(r.status).toBe(400);
  });
});
