import type { FastifyInstance } from 'fastify';

/** Product guarantees, not a dependency health or uptime promise. */
export function deploymentCapabilities() {
  return {
    memory: { storage: 'postgres', encryption: 'server-managed-at-rest', operatorCanRead: true },
    cache: process.env.REDIS_URL ? 'configured-optional' : 'disabled-direct-database',
    graph: process.env.NEO4J_URI ? 'configured-optional-with-tag-fallback' : 'postgres-tag-cooccurrence',
    attestations: process.env.MONAD_RPC_URL && process.env.MONAD_PRIVATE_KEY && process.env.ATTESTATION_AGGREGATOR_ADDRESS
      ? 'submission-configured-check-individual-confirmation' : 'local-records-only-not-on-chain',
    market: { paidExchange: false, scan: 'authenticated-regex-only-not-anonymisation-guarantee' },
  };
}

export async function capabilityRoutes(app: FastifyInstance) {
  app.get('/capabilities', async (_, reply) => {
    reply.header('Cache-Control', 'no-store');
    return { success: true, data: deploymentCapabilities() };
  });
}
