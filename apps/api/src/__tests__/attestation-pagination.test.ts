import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
const mocks = vi.hoisted(() => ({ select: vi.fn() }));
vi.mock('../db/index.js', () => ({ db: { select: mocks.select }, attestations: { vaultId: 'vault', createdAt: 'created' } }));
vi.mock('../middleware/auth.js', () => ({ authMiddleware: async () => {}, requireVaultMatch: () => async () => {} }));
import { attestationRoutes } from '../routes/attestations.js';
describe('attestation pagination validation', () => {
  it('rejects malformed or unsafe pagination before querying the database', async () => {
    const app = Fastify(); await app.register(attestationRoutes, { prefix: '/v1' });
    for (const query of ['page=abc', 'limit=oops', 'page=0', 'limit=101', 'page=1.5', 'page=9007199254740993']) {
      const result = await app.inject({ url: `/v1/vaults/test/attestations?${query}` });
      expect(result.statusCode).toBe(400);
      expect(result.json().error.code).toBe('VALIDATION_ERROR');
    }
    expect(mocks.select).not.toHaveBeenCalled();
    await app.close();
  });
});
