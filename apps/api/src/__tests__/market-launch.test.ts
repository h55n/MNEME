import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
vi.mock('../db/index.js', () => ({ db: {}, packPurchases: {}, memoryPacks: {}, memories: {} }));
vi.mock('../middleware/auth.js', () => ({
  authMiddleware: async (req: { headers: { authorization?: string } }, reply: { code: (n: number) => { send: (b: unknown) => unknown } }) => {
    if (req.headers.authorization !== 'Bearer test-key') return reply.code(401).send({ success: false });
  },
  requireVaultMatch: () => async () => {},
}));
vi.mock('../services/market.service.js', () => ({ marketService: { scanPlaintext: vi.fn(async () => ({ passed: true, piiItemsRemoved: 0 })) } }));
import { marketRoutes } from '../routes/market.js';
describe('market launch gate', () => {
  it('rejects listing and purchase mutations before database or payments', async () => {
    const app = Fastify(); await app.register(marketRoutes, { prefix: '/v1' });
    for (const url of ['/v1/market/packs', '/v1/market/packs/example/purchase', '/v1/vaults/example/ingest/example']) {
      const res = await app.inject({ method: 'POST', url, payload: {} });
      expect(res.statusCode).toBe(503); expect(res.json().error.code).toBe('MARKET_UNAVAILABLE');
    }
    await app.close();
  });
  it('requires authenticated explicit consent and marks scan output no-store', async () => {
    const app = Fastify(); await app.register(marketRoutes, { prefix: '/v1' });
    const url = '/v1/market/packs/scan';
    expect((await app.inject({ method: 'POST', url, payload: { contents: ['hello'], processingConsent: true } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url, headers: { authorization: 'Bearer test-key' }, payload: { contents: ['hello'] } })).statusCode).toBe(400);
    const res = await app.inject({ method: 'POST', url, headers: { authorization: 'Bearer test-key' }, payload: { contents: ['hello'], processingConsent: true } });
    expect(res.statusCode).toBe(200); expect(res.headers['cache-control']).toBe('no-store');
    await app.close();
  });
});
