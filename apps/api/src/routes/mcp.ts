import type { FastifyInstance } from 'fastify';
import { createMcpHttpHandler, type HttpMcpOptions } from '@mneme/mcp/http';

/** Share the API origin and its rate limit; credentials remain per request. */
export async function mcpRoutes(app: FastifyInstance, opts: HttpMcpOptions) {
  const handle = createMcpHttpHandler(opts);
  app.route({
    method: ['GET', 'POST', 'DELETE'],
    url: '/mcp',
    bodyLimit: 1_000_000,
    handler: async (request, reply) => {
      reply.hijack();
      await handle(request.raw, reply.raw, request.body);
    },
  });
}
