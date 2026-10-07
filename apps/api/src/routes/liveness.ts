import type { FastifyInstance } from 'fastify';

/** Process liveness only. Do not import database or dependency checks here. */
export async function livenessRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/livez', async (_, reply) => {
    reply.header('Cache-Control', 'no-store');
    return { status: 'alive' };
  });
}
