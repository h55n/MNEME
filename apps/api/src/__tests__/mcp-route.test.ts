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
  it('forgets a memory through a real Fastify DELETE without an empty JSON body', async () => {
    const app = Fastify(); apps.push(app);
    const memoryId = '22222222-2222-4222-8222-222222222222';
    app.delete('/v1/vaults/:vaultId/memories/:memoryId', async () => ({
      success: true, data: { deleted: true },
    }));
    const origin = await app.listen({ port: 0, host: '127.0.0.1' });
    const { createMcpHttpServer } = await import('@mneme/mcp/http');
    const server = createMcpHttpServer({ apiBase: `${origin}/v1` });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as { port: number }).port;
    const client = new Client({ name: 'delete-integration', version: '1' });
    try {
      await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp?vault=11111111-1111-4111-8111-111111111111`), {
        requestInit: { headers: { Authorization: 'Bearer test-key' } },
      }));
      const result = await client.callTool({ name: 'memory_forget', arguments: { memoryId } });
      expect(result.isError).not.toBe(true);
      expect(JSON.parse((result.content as { text: string }[])[0].text)).toEqual({ deleted: true });
    } finally {
      await client.close();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
  it('keeps missing credentials and unsupported methods closed', async () => {
    const app = Fastify(); apps.push(app);
    await app.register(mcpRoutes, { apiBase: 'http://upstream/v1' });
    expect((await app.inject({ method: 'POST', url: '/mcp', payload: {} })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/mcp' })).statusCode).toBe(405);
  });
});
