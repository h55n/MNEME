#!/usr/bin/env node
import 'dotenv/config';
import { createServer, type IncomingMessage, type ServerResponse, type Server as HttpServer } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMnemeServer } from './server.js';

/**
 * Remote MCP endpoint (Streamable HTTP, stateless) at POST /mcp.
 *
 * The caller sends their own MNEME API key as `Authorization: Bearer <key>` and the vault as
 * `X-Mneme-Vault-Id: <uuid>` (or `?vault=<uuid>`). Nothing is stored here: each request builds a
 * server bound to that key and vault, forwards tool calls to the MNEME API, and is discarded.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 1_000_000;

export interface HttpMcpOptions {
  apiBase: string;
  fetchImpl?: typeof fetch;
}

function send(res: ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...extra });
  res.end(JSON.stringify(body));
}

function rpcError(res: ServerResponse, status: number, code: number, message: string, extra: Record<string, string> = {}) {
  send(res, status, { jsonrpc: '2.0', error: { code, message }, id: null }, extra);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error('too large');
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createMcpHttpServer(opts: HttpMcpOptions): HttpServer {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (url.pathname === '/health') return send(res, 200, { status: 'ok' });
    if (url.pathname !== '/mcp') return send(res, 404, { error: 'Not found' });

    // Stateless: no server-to-client streams and no sessions to close.
    if (req.method !== 'POST') return rpcError(res, 405, -32000, 'Method not allowed', { Allow: 'POST' });

    const auth = req.headers.authorization ?? '';
    const apiKey = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!apiKey) {
      return rpcError(res, 401, -32001, 'Missing Authorization: Bearer <MNEME API key>', { 'WWW-Authenticate': 'Bearer' });
    }
    const vaultId = String(req.headers['x-mneme-vault-id'] ?? url.searchParams.get('vault') ?? '');
    if (!UUID.test(vaultId)) {
      return rpcError(res, 400, -32002, 'Missing or invalid vault id (X-Mneme-Vault-Id header or ?vault=<uuid>)');
    }

    let body: unknown;
    try {
      body = await readJson(req);
    } catch {
      return rpcError(res, 400, -32700, 'Request body must be JSON under 1 MB');
    }

    const server = createMnemeServer({
      apiBase: opts.apiBase,
      apiKey,
      vaultId,
      operatorPublicKey: String(req.headers['x-operator-public-key'] ?? ''),
      fetchImpl: opts.fetchImpl,
    });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (err) {
      if (!res.headersSent) rpcError(res, 500, -32603, `Internal error: ${String(err)}`);
    }
  });
}

// Run only when started directly, not when imported by tests.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const port = Number(process.env.PORT ?? 3002);
  createMcpHttpServer({ apiBase: process.env.MNEME_API_URL ?? 'http://localhost:3001/v1' }).listen(port, '0.0.0.0', () => {
    console.error(`MNEME remote MCP listening on :${port}/mcp`);
  });
}
