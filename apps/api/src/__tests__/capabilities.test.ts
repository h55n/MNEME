import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import { capabilityRoutes, deploymentCapabilities } from '../routes/capabilities.js';

describe('honest deployment capabilities', () => {
  it('never presents local records as on-chain proofs or enables paid exchange', () => {
    vi.stubEnv('MONAD_PRIVATE_KEY', '');
    expect(deploymentCapabilities().attestations).toBe('local-records-only-not-on-chain');
    expect(deploymentCapabilities().market.paidExchange).toBe(false);
    expect(deploymentCapabilities().memory.operatorCanRead).toBe(true);
    vi.unstubAllEnvs();
  });
  it('serves no-store guarantees without exposing secrets', async () => {
    const app = Fastify();
    await app.register(capabilityRoutes, { prefix: '/v1' });
    const res = await app.inject('/v1/capabilities');
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.json().data.memory.storage).toBe('postgres');
    await app.close();
  });
});
