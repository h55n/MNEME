import { afterEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { mcpRoutes } from '../routes/mcp.js';

const apps: ReturnType<typeof Fastify>[] = [];
afterEach(async () => { await Promise.all(apps.map(app => app.close())); apps.length = 0; });
describe('API-hosted MCP', () => {
  it('initializes, lists and calls tools through the API origin', async () => {
    const app = Fastify(); apps.push(app);
    const upstream: string[] = [];
    await app.register(mcpRoutes, { apiBase: 'http://upstream/v1', fetchImpl: (async (url) => {
      upstream.push(String(url));
      return new Response(JSON.stringify({ success: true, data: { memories: [] } }));
    }) as typeof fetch });
    const origin = await app.listen({ port: 0, host: '127.0.0.1' });
    const client = new Client({ name: 'integration', version: '1' });
    try {
      await client.connect(new StreamableHTTPClientTransport(new URL(`${origin}/mcp?vault=11111111-1111-4111-8111-111111111111`), {
        requestInit: { headers: { Authorization: 'Bearer test-key' } },
      }));
      expect((await client.listTools()).tools).toHaveLength(7);
      await client.callTool({ name: 'memory_list', arguments: {} });
      expect(upstream[0]).toContain('/vaults/11111111-1111-4111-8111-111111111111/memories');
    } finally { await client.close(); }
  });
  it('keeps missing credentials and unsupported methods closed', async () => {
    const app = Fastify(); apps.push(app);
    await app.register(mcpRoutes, { apiBase: 'http://upstream/v1' });
    expect((await app.inject({ method: 'POST', url: '/mcp', payload: {} })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/mcp' })).statusCode).toBe(405);
  });
});
