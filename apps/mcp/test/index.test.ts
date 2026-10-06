import { describe, it, expect, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMnemeServer, transformImport } from '../src/server.js';

type Call = { url: string; method: string; headers: Record<string, string>; body: any };

const VAULT = '11111111-1111-4111-8111-111111111111';
const MEM = '22222222-2222-4222-8222-222222222222';

async function connect(respond: (c: Call) => { status?: number; json: unknown } | Promise<never>) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const call: Call = {
      url,
      method: init.method ?? 'GET',
      headers: init.headers as Record<string, string>,
      body: init.body ? JSON.parse(init.body as string) : undefined,
    };
    calls.push(call);
    const r = await respond(call);
    return new Response(typeof r.json === 'string' ? r.json : JSON.stringify(r.json), { status: r.status ?? 200 });
  }) as unknown as typeof fetch;

  const server = createMnemeServer({
    apiBase: 'http://api.test/v1',
    apiKey: 'key-123',
    vaultId: VAULT,
    operatorPublicKey: 'op-pub',
    fetchImpl,
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '1.0.0' }, { capabilities: {} });
  await Promise.all([server.connect(a), client.connect(b)]);
  return { client, calls };
}

const ok = (data: unknown) => ({ json: { success: true, data } });

describe('MCP server over a real MCP client connection', () => {
  let ctx: Awaited<ReturnType<typeof connect>>;
  beforeEach(async () => {
    ctx = await connect(() => ok({ id: MEM }));
  });

  it('lists the seven memory tools with object schemas', async () => {
    const { tools } = await ctx.client.listTools();
    expect(tools.map(t => t.name).sort()).toEqual([
      'memory_export', 'memory_forget', 'memory_import', 'memory_inspect', 'memory_list', 'memory_recall', 'memory_write',
    ]);
    for (const t of tools) expect(t.inputSchema.type).toBe('object');
  });

  it('memory_write posts to the vault with auth headers', async () => {
    const res: any = await ctx.client.callTool({ name: 'memory_write', arguments: { content: 'I live in Pune', importance: 0.7 } });
    expect(ctx.calls).toHaveLength(1);
    const c = ctx.calls[0];
    expect(c.url).toBe(`http://api.test/v1/vaults/${VAULT}/memories`);
    expect(c.method).toBe('POST');
    expect(c.headers.Authorization).toBe('Bearer key-123');
    expect(c.headers['X-Operator-Public-Key']).toBe('op-pub');
    expect(c.body.content).toBe('I live in Pune');
    expect(JSON.parse(res.content[0].text).id).toBe(MEM);
  });

  it('memory_recall passes the query and budget through', async () => {
    await ctx.client.callTool({ name: 'memory_recall', arguments: { query: 'where do I live', budget_tokens: 500, task_scope: 'travel' } });
    const c = ctx.calls[0];
    expect(c.url).toBe(`http://api.test/v1/vaults/${VAULT}/memories/recall`);
    expect(c.body).toMatchObject({ query: 'where do I live', budget_tokens: 500, task_scope: 'travel' });
  });

  it('memory_forget deletes by id', async () => {
    await ctx.client.callTool({ name: 'memory_forget', arguments: { memoryId: MEM } });
    expect(ctx.calls[0].method).toBe('DELETE');
    expect(ctx.calls[0].url).toBe(`http://api.test/v1/vaults/${VAULT}/memories/${MEM}`);
  });

  it('rejects bad input before calling the API', async () => {
    await expect(ctx.client.callTool({ name: 'memory_forget', arguments: { memoryId: 'not-a-uuid' } })).rejects.toThrow(/Invalid parameters/);
    await expect(ctx.client.callTool({ name: 'memory_write', arguments: { content: '' } })).rejects.toThrow(/Invalid parameters/);
    await expect(ctx.client.callTool({ name: 'memory_recall', arguments: { query: 'x', limit: 1000 } })).rejects.toThrow(/Invalid parameters/);
    expect(ctx.calls).toHaveLength(0);
  });

  it('rejects an unknown tool', async () => {
    await expect(ctx.client.callTool({ name: 'memory_nuke', arguments: {} })).rejects.toThrow(/Unknown tool/);
  });

  it('memory_import converts a mem0 export and batches it', async () => {
    const memories = Array.from({ length: 501 }, (_, i) => ({ memory: `fact ${i}`, categories: ['x'] }));
    const c = await connect(call => (call.url.endsWith('/batch') ? ok({ imported: call.body.memories.length, failed: 0 }) : ok({})));
    const res: any = await c.client.callTool({ name: 'memory_import', arguments: { format: 'mem0', data: { memories } } });
    expect(c.calls).toHaveLength(2);
    expect(c.calls[0].body.memories).toHaveLength(500);
    expect(c.calls[1].body.memories).toHaveLength(1);
    expect(res.content[0].text).toBe('Successfully imported 501 memories. Failed: 0.');
  });
});

describe('API failures surface as MCP errors', () => {
  it('passes through the API error message', async () => {
    const c = await connect(() => ({ status: 403, json: { success: false, error: { message: 'Vault not found' } } }));
    await expect(c.client.callTool({ name: 'memory_list', arguments: {} })).rejects.toThrow(/Vault not found/);
  });

  it('reports a non-JSON response (for example a gateway page)', async () => {
    const c = await connect(() => ({ status: 502, json: '<html>Bad gateway</html>' }));
    await expect(c.client.callTool({ name: 'memory_list', arguments: {} })).rejects.toThrow(/non-JSON response \(HTTP 502\)/);
  });

  it('reports an unreachable API', async () => {
    const c = await connect(() => Promise.reject(new Error('ECONNREFUSED')) as never);
    await expect(c.client.callTool({ name: 'memory_list', arguments: {} })).rejects.toThrow(/unreachable/);
  });
});

describe('transformImport', () => {
  it('maps each supported format and ignores unknown ones', () => {
    expect(transformImport('zep', { messages: [{ role: 'user', content: 'hi' }] })[0]).toMatchObject({ content: '[user]: hi', type: 'episodic' });
    expect(transformImport('letta', { core_memory: 'core', recall_memory: ['a'] })).toHaveLength(2);
    expect(transformImport('mneme', { memories: [{ content: 'c', type: 'semantic', tags: ['t'] }] })[0].tags).toEqual(['t', 'imported', 'mneme']);
    expect(transformImport('bogus', {})).toEqual([]);
  });
});
