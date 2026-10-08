import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
vi.mock('../services/vault.service.js', () => ({ vaultService: {
  create: vi.fn(async () => ({ vault: { id: 'vault-one' }, apiKey: 'test-only-key' })),
  rotateApiKey: vi.fn(async () => 'test-only-rotated-key'),
} }));
vi.mock('../services/memory.service.js', () => ({ memoryService: {} }));
vi.mock('../services/compliance.service.js', () => ({ complianceService: {} }));
vi.mock('../middleware/auth.js', () => ({ authMiddleware: async () => {}, requireVaultMatch: () => async () => {} }));
import { vaultRoutes } from '../routes/vaults.js';
describe('credential response privacy', () => {
  it('never allows caches to store a newly issued vault key', async () => {
    const app = Fastify(); await app.register(vaultRoutes, { prefix: '/v1' });
    const result = await app.inject({ method: 'POST', url: '/v1/vaults', payload: { operatorAddress: 'test-operator' } });
    expect(result.statusCode).toBe(201); expect(result.headers['cache-control']).toBe('no-store');
    await app.close();
  });
  it('never allows caches to store a rotated key', async () => {
    const app = Fastify(); await app.register(vaultRoutes, { prefix: '/v1' });
    const result = await app.inject({ method: 'POST', url: '/v1/vaults/vault-one/keys/rotate' });
    expect(result.statusCode).toBe(200); expect(result.headers['cache-control']).toBe('no-store');
    await app.close();
  });
});
