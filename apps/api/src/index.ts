import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { vaultRoutes } from './routes/vaults.js';
import { memoryRoutes } from './routes/memories.js';
import { marketRoutes } from './routes/market.js';
import { complianceRoutes } from './routes/compliance.js';
import { attestationRoutes } from './routes/attestations.js';
import { gptRoutes } from './routes/gpt.js';
import { attestationBatcher } from './blockchain/attestation-batcher.js';
import { graphService } from './services/graph.service.js';
import { logger } from './utils/logger.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import { redis } from './db/redis.js';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import { decayJob } from './jobs/decay.job.js';

const PORT = parseInt(process.env.API_PORT ?? '3001');
const HOST = process.env.HOST ?? '0.0.0.0';
const API_PREFIX = '/v1';
const VERSION = '1.0.0';

// ── Dependency health checks ──────────────────────────────────────────────────

interface DependencyStatus {
  postgres: 'ok' | 'down';
  redis: 'ok' | 'down';
  neo4j: 'ok' | 'down';
  monad: 'ok' | 'down';
  embedding: 'ok' | 'down';
}

async function checkDependencies(): Promise<DependencyStatus> {
  const status: DependencyStatus = {
    postgres: 'down',
    redis: 'down',
    neo4j: 'down',
    monad: 'down',
    embedding: 'down',
  };

  // PostgreSQL (hard required)
  try {
    await db.execute(sql`SELECT 1`);
    status.postgres = 'ok';
  } catch (err) {
    logger.error({ err }, 'PostgreSQL health check failed');
  }

  // Redis (optional)
  try {
    const client = redis.getInstance();
    if (client && redis.isAvailable) {
      status.redis = 'ok';
    }
  } catch {
    // expected when Redis is unavailable
  }

  // Neo4j (optional)
  try {
    const available = await graphService.isAvailable();
    if (available) status.neo4j = 'ok';
  } catch {
    // expected when Neo4j is unavailable
  }

  // Monad RPC (optional)
  try {
    const rpcUrl = process.env.MONAD_RPC_URL;
    if (rpcUrl) {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) status.monad = 'ok';
    }
  } catch {
    // expected when Monad RPC is unavailable
  }

  // Embedding API (optional)
  try {
    if (process.env.OPENAI_API_KEY) status.embedding = 'ok';
  } catch {
    // noop
  }

  return status;
}

function logDependencyStatus(status: DependencyStatus): void {
  const icon = (s: string) => s === 'ok' ? '✓' : '⚠';
  const descriptions: Record<string, string> = {
    neo4j: 'graph features disabled',
    monad: 'attestations queued locally',
    redis: 'no-cache mode',
    embedding: 'falling back to text search',
  };

  const lines = [
    '',
    '[MNEME] Dependency check:',
    `  ${icon(status.postgres)} PostgreSQL      — ${status.postgres === 'ok' ? 'connected' : 'UNAVAILABLE (fatal)'}`,
    `  ${icon(status.redis)}   Redis           — ${status.redis === 'ok' ? 'connected' : `unavailable (${descriptions.redis})`}`,
    `  ${icon(status.neo4j)}   Neo4j           — ${status.neo4j === 'ok' ? 'connected' : `unavailable (${descriptions.neo4j})`}`,
    `  ${icon(status.monad)}   Monad RPC       — ${status.monad === 'ok' ? 'connected' : `unavailable (${descriptions.monad})`}`,
    `  ${icon(status.embedding)} Embedding API  — ${status.embedding === 'ok' ? 'connected' : `unavailable (${descriptions.embedding})`}`,
    '',
  ];

  console.log(lines.join('\n'));

  if (status.postgres === 'down') {
    logger.error('PostgreSQL is required — cannot start');
    process.exit(1);
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  const fastify = Fastify({
    logger: false, // We use pino directly
    requestIdHeader: 'x-request-id',
    genReqId: () => uuidv4(),
    trustProxy: true,
  });

  // ── Plugins ───────────────────────────────────────────────────────────────
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Operator-Public-Key', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false, // API server — no HTML
  });

  await fastify.register(rateLimit, {
    global: true,
    max: 1000,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return request.headers.authorization?.split(' ')[1]?.slice(0, 16) ?? request.ip;
    },
  });

  // ── Request ID propagation ────────────────────────────────────────────────
  fastify.addHook('onSend', async (request, reply) => {
    reply.header('X-Request-ID', request.id);
  });

  // ── Health ────────────────────────────────────────────────────────────────
  let cachedDeps: DependencyStatus | null = null;
  let depsLastChecked = 0;
  const DEPS_CACHE_MS = 30_000; // Re-check every 30s

  fastify.get('/health', async (_, reply) => {
    const now = Date.now();
    if (!cachedDeps || now - depsLastChecked > DEPS_CACHE_MS) {
      cachedDeps = await checkDependencies();
      depsLastChecked = now;
    }

    const allCriticalOk = cachedDeps.postgres === 'ok';
    const someOptionalDown = Object.entries(cachedDeps)
      .filter(([k]) => k !== 'postgres')
      .some(([, v]) => v === 'down');

    const overallStatus = !allCriticalOk ? 'down'
      : someOptionalDown ? 'degraded'
      : 'ok';

    const statusCode = overallStatus === 'down' ? 503 : 200;

    reply.status(statusCode).send({
      status: overallStatus,
      version: VERSION,
      dependencies: cachedDeps,
      timestamp: new Date().toISOString(),
    });
  });

  fastify.get('/', async (_, reply) => {
    reply.send({
      name: 'MNEME API',
      version: VERSION,
      docs: `${API_PREFIX}/docs`,
    });
  });

  // ── Routes ────────────────────────────────────────────────────────────────
  await fastify.register(vaultRoutes, { prefix: API_PREFIX });
  await fastify.register(memoryRoutes, { prefix: API_PREFIX });
  await fastify.register(marketRoutes, { prefix: API_PREFIX });
  await fastify.register(complianceRoutes, { prefix: API_PREFIX });
  await fastify.register(attestationRoutes, { prefix: API_PREFIX });
  await fastify.register(gptRoutes, { prefix: `${API_PREFIX}/gpt` });

  // ── Error Handler ─────────────────────────────────────────────────────────
  fastify.setErrorHandler(async (error, request, reply) => {
    logger.error({ err: error, url: request.url, requestId: request.id }, 'Unhandled error');
    reply.status(error.statusCode ?? 500).send({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      },
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
        version: `v1/${VERSION}`,
      },
    });
  });

  // ── 404 ───────────────────────────────────────────────────────────────────
  fastify.setNotFoundHandler(async (request, reply) => {
    reply.status(404).send({
      success: false,
      data: null,
      error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} not found` },
      meta: { requestId: request.id, timestamp: new Date().toISOString(), version: `v1/${VERSION}` },
    });
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    await attestationBatcher.emergencyFlush();
    await graphService.close();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // ── Startup dependency check ──────────────────────────────────────────────
  const depStatus = await checkDependencies();
  logDependencyStatus(depStatus);
  cachedDeps = depStatus;
  depsLastChecked = Date.now();

  // ── Scheduled Jobs ────────────────────────────────────────────────────────
  cron.schedule('0 * * * *', () => { // Run every hour
    decayJob.run().catch((err) => logger.error({ err }, 'Decay job failed'));
  });
  logger.info('Decay job scheduled (hourly)');

  // ── Start ─────────────────────────────────────────────────────────────────
  try {
    await fastify.listen({ port: PORT, host: HOST });
    logger.info({ port: PORT, prefix: API_PREFIX }, 'MNEME API started');
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
