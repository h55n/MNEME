import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';

vi.mock('../db/index.js', () => ({ db: {}, vaults: {}, memories: {}, attestations: {}, apiKeys: {} }));
vi.mock('../blockchain/attestation-batcher.js', () => ({ attestationBatcher: { add: vi.fn() } }));
vi.mock('../services/graph.service.js', () => ({ graphService: {} }));

import { vaultRoutes } from '../routes/vaults.js';

async function build(limit: string, trustProxy: number | boolean) {
  process.env.VAULT_CREATE_LIMIT = limit;
  const app = Fastify({ trustProxy });
  await app.register(rateLimit, { global: true, max: 1000, timeWindow: '1 minute', keyGenerator: r => r.ip });
  await app.register(vaultRoutes, { prefix: '/v1' });
  await app.ready();
  return app;
}

const create = (app: Awaited<ReturnType<typeof build>>, headers: Record<string, string> = {}) =>
  app.inject({ method: 'POST', url: '/v1/vaults', payload: {}, headers });

describe('POST /vaults per-IP limit', () => {
  it('returns 429 once one IP passes the limit, even for invalid requests', async () => {
    const app = await build('3', 1);
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await create(app)).statusCode);
    expect(codes.slice(0, 3).every(c => c === 400)).toBe(true);
    expect(codes.slice(3)).toEqual([429, 429]);
    await app.close();
  });

  it('does not let a client escape the limit by changing a forged X-Forwarded-For or the bearer token', async () => {
    const app = await build('2', 1);
    const codes: number[] = [];
    for (let i = 0; i < 4; i++) {
      // One trusted proxy hop: it appends the real client IP (the last entry). Anything before it is client-supplied.
      codes.push((await create(app, { 'x-forwarded-for': `10.0.0.${i}, 203.0.113.9`, authorization: `Bearer random-${i}` })).statusCode);
    }
    expect(codes).toEqual([400, 400, 429, 429]);
    await app.close();
  });

  it('counts different real IPs separately', async () => {
    const app = await build('1', 1);
    const a = await create(app, { 'x-forwarded-for': '203.0.113.1' });
    const b = await create(app, { 'x-forwarded-for': '203.0.113.2' });
    const a2 = await create(app, { 'x-forwarded-for': '203.0.113.1' });
    expect([a.statusCode, b.statusCode, a2.statusCode]).toEqual([400, 400, 429]);
    await app.close();
  });
});
