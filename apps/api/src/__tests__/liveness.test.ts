import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { livenessRoutes } from '../routes/liveness.js';

describe('process liveness', () => {
  it('responds without any database configuration or dependency imports', async () => {
    const app = Fastify();
    try {
      await app.register(livenessRoutes);
      const result = await app.inject({ method: 'GET', url: '/livez' });
      expect(result.statusCode).toBe(200);
      expect(result.json()).toEqual({ status: 'alive' });
      expect(result.headers['cache-control']).toBe('no-store');
    } finally {
      await app.close();
    }
  });

  it('also handles HEAD without a body', async () => {
    const app = Fastify();
    try {
      await app.register(livenessRoutes);
      const result = await app.inject({ method: 'HEAD', url: '/livez' });
      expect(result.statusCode).toBe(200);
      expect(result.body).toBe('');
    } finally {
      await app.close();
    }
  });
});
