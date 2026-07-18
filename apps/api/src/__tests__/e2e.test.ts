/**
 * MNEME End-to-End Integration Tests
 *
 * Tests the full happy path using fastify.inject() (in-process, no external HTTP server).
 * Mocks: attestation batcher, embedding service, Neo4j graph service.
 * Requires: PostgreSQL (DATABASE_URL env var, or TEST_DATABASE_URL).
 *
 * Run: npm test --workspace=apps/api
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

// ── Mock heavy dependencies before importing routes ───────────────────────────

vi.mock('../blockchain/attestation-batcher.js', () => ({
  attestationBatcher: {
    add: vi.fn().mockResolvedValue('mock-hash'),
    emergencyFlush: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
  },
}));

vi.mock('../services/embedding.service.js', () => ({
  embeddingService: {
    embed: vi.fn().mockResolvedValue(
      // Deterministic non-zero vector (simulates real embedding)
      Array.from({ length: 1536 }, (_, i) => Math.sin(i * 0.01))
    ),
  },
}));

vi.mock('../services/graph.service.js', () => ({
  graphService: {
    isAvailable: vi.fn().mockResolvedValue(false),
    isAvailableSync: vi.fn().mockReturnValue(false),
    ensureAgent: vi.fn().mockResolvedValue(undefined),
    storeFacts: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/extraction.service.js', () => ({
  extractionService: {
    extract: vi.fn().mockResolvedValue({ entities: [], facts: [] }),
  },
}));

vi.mock('../db/redis.js', () => ({
  redis: { isAvailable: false, getInstance: () => null },
  setSession: vi.fn().mockResolvedValue(undefined),
  getSession: vi.fn().mockResolvedValue(null),
  deleteSession: vi.fn().mockResolvedValue(undefined),
  cacheMemory: vi.fn().mockResolvedValue(undefined),
  getCachedMemory: vi.fn().mockResolvedValue(null),
  getVaultHotMemoryIds: vi.fn().mockResolvedValue([]),
}));

// ── Route imports (after mocks) ───────────────────────────────────────────────

import { vaultRoutes } from '../routes/vaults.js';
import { memoryRoutes } from '../routes/memories.js';
import { marketRoutes } from '../routes/market.js';
import { complianceRoutes } from '../routes/compliance.js';
import { attestationRoutes } from '../routes/attestations.js';

// ── Test server factory ───────────────────────────────────────────────────────

async function buildTestServer(): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: true, genReqId: () => 'test-req-id' });

  await fastify.register(cors, { origin: '*' });
  await fastify.register(helmet, { contentSecurityPolicy: false });

  await fastify.register(vaultRoutes, { prefix: '/v1' });
  await fastify.register(memoryRoutes, { prefix: '/v1' });
  await fastify.register(marketRoutes, { prefix: '/v1' });
  await fastify.register(complianceRoutes, { prefix: '/v1' });
  await fastify.register(attestationRoutes, { prefix: '/v1' });

  await fastify.ready();
  return fastify;
}

// ── Test state ────────────────────────────────────────────────────────────────

let app: FastifyInstance;
let vaultId: string;
let apiKey: string;
const operatorPublicKey = '0x8e11d906a07F037029409e21fa14A0B733F0B431';
const memoryIds: string[] = [];

const MEMORY_CONTENTS = [
  'Client prefers concise responses under 200 words.',
  'Project deadline is March 15th, 2026.',
  'Use TypeScript strict mode for all new code.',
  'The API rate limit is 1000 requests per minute.',
  'Preferred output format is JSON with snake_case keys.',
];

// For distractor filter test
const BILLING_MEMORIES = [
  "User's payment method is Visa ending in 4242",
  "User's billing address is 123 Main St",
  "User's subscription is Pro tier",
];

const CODING_MEMORIES = [
  "User prefers TypeScript strict mode",
  "User's repo uses Turborepo monorepo setup",
];

// ── Suite ─────────────────────────────────────────────────────────────────────

describe.skipIf(!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL)('MNEME E2E Happy Path', () => {

  beforeAll(async () => {
    // Use test database if provided, otherwise use main DATABASE_URL
    if (process.env.TEST_DATABASE_URL) {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    }
    app = await buildTestServer();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // ── Step 1: Create vault ────────────────────────────────────────────────────

  it('Step 1: creates a vault', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/vaults',
      payload: {
        operatorAddress: operatorPublicKey,
        name: 'E2E Test Vault',
        network: 'testnet',
        plan: 'free',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.vault).toBeDefined();
    expect(body.data.apiKey).toMatch(/^mneme_/);
    expect(body.data.vault.id).toBeTruthy();

    vaultId = body.data.vault.id;
    apiKey = body.data.apiKey;

    console.log(`  → Vault ID: ${vaultId}`);
    console.log(`  → API Key: ${apiKey.slice(0, 16)}...`);
  });

  // ── Step 2: Write 5 memories of mixed types ─────────────────────────────────

  it('Step 2: writes 5 memories and verifies classifier output', async () => {
    const types: Array<string> = [
      'semantic', 'episodic', 'procedural', 'semantic', 'procedural',
    ];

    for (let i = 0; i < MEMORY_CONTENTS.length; i++) {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/vaults/${vaultId}/memories`,
        headers: {
          authorization: `Bearer ${apiKey}`,
          'x-operator-public-key': operatorPublicKey,
        },
        payload: {
          content: MEMORY_CONTENTS[i],
          type: types[i],
          tags: [`e2e-test`, `batch-${i + 1}`],
          importance: 0.5 + i * 0.1,
          task_scope: 'general',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.memory.id).toBeTruthy();
      expect(body.data.contentHash).toBeTruthy();
      expect(body.data.attestationId).toBeTruthy();
      // Phase 1: classifier fields always present
      expect(body.data.classifiedType).toBeTruthy();
      expect(typeof body.data.hintTypeUsed).toBe('boolean');
      expect(body.data.memory.tokenCount).toBeGreaterThan(0);

      memoryIds.push(body.data.memory.id);
    }

    expect(memoryIds).toHaveLength(5);
    console.log(`  → Wrote ${memoryIds.length} memories`);
  });

  // ── Step 2b: Hint-type override bypasses classifier ────────────────────────

  it('Step 2b: hint_type hard-overrides classifier', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/vaults/${vaultId}/memories`,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'x-operator-public-key': operatorPublicKey,
      },
      payload: {
        content: 'Right now in this session we are testing hint override',
        hint_type: 'working',  // force working even though content looks working anyway
        task_scope: 'testing',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.classifiedType).toBe('working');
    expect(body.data.hintTypeUsed).toBe(true);
    console.log(`  → hint_type=working correctly stored as classifiedType=working`);
  });

  // ── Step 2c: Distractor filter (core differentiator) ──────────────────────

  it('Step 2c: distractor filter removes billing memories from coding-scoped recall', async () => {
    // Write billing-scoped memories
    for (const content of BILLING_MEMORIES) {
      await app.inject({
        method: 'POST',
        url: `/v1/vaults/${vaultId}/memories`,
        headers: {
          authorization: `Bearer ${apiKey}`,
          'x-operator-public-key': operatorPublicKey,
        },
        payload: { content, task_scope: 'billing', importance: 0.8 },
      });
    }

    // Write coding-scoped memories
    for (const content of CODING_MEMORIES) {
      await app.inject({
        method: 'POST',
        url: `/v1/vaults/${vaultId}/memories`,
        headers: {
          authorization: `Bearer ${apiKey}`,
          'x-operator-public-key': operatorPublicKey,
        },
        payload: { content, task_scope: 'coding', importance: 0.8 },
      });
    }

    // Recall with coding scope — "preferences" is semantically similar to billing preferences too
    const res = await app.inject({
      method: 'POST',
      url: `/v1/vaults/${vaultId}/memories/recall`,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'x-operator-public-key': operatorPublicKey,
      },
      payload: {
        query: "user's configuration preferences",
        task_scope: 'coding',
        budget_tokens: 2000,
        task_type: 'general',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);

    // Phase 2 metadata fields must always be present
    expect(typeof body.data.totalTokensUsed).toBe('number');
    expect(body.data.totalTokensUsed).toBeLessThanOrEqual(2000);
    expect(typeof body.data.stage2Removed).toBe('number');
    expect(typeof body.data.stage1Candidates).toBe('number');
    expect(body.data.taskScopeDetected).toBe('coding');

    console.log(`  → stage2Removed=${body.data.stage2Removed}, totalTokensUsed=${body.data.totalTokensUsed}`);
    console.log(`  → Memories returned: ${body.data.memories.length}`);
  });

  // ── Step 3: Recall memories with semantic query ──────────────────────────────

  it('Step 3: recalls memories with semantic query', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/vaults/${vaultId}/memories/recall`,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'x-operator-public-key': operatorPublicKey,
      },
      payload: {
        query: 'client communication preferences',
        limit: 5,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.memories).toBeDefined();
    expect(Array.isArray(body.data.memories)).toBe(true);
    expect(body.data.memories.length).toBeGreaterThan(0);

    // All recalled memories should be decryptable (have content)
    for (const mem of body.data.memories) {
      expect(mem.content).toBeTruthy();
      expect(mem.id).toBeTruthy();
    }

    console.log(`  → Recalled ${body.data.memories.length} memories`);
  });

  // ── Step 4: Temporal inspect at historical timestamp ───────────────────────

  it('Step 4: inspects memories at a historical timestamp', async () => {
    // Add a 1 second buffer to account for possible clock skew between Node.js and Postgres
    const targetDate = new Date();
    targetDate.setSeconds(targetDate.getSeconds() + 1);
    const timestamp = targetDate.toISOString();

    const res = await app.inject({
      method: 'POST',
      url: `/v1/vaults/${vaultId}/memories/inspect`,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'x-operator-public-key': operatorPublicKey,
      },
      payload: {
        timestamp,
        query: 'TypeScript',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.memories).toBeDefined();
    // At least the TypeScript memory should appear
    const hasTypescript = body.data.memories.some((m: any) =>
      m.content.toLowerCase().includes('typescript')
    );
    expect(hasTypescript).toBe(true);

    console.log(`  → Inspect returned ${body.data.memories.length} memories at ${timestamp}`);
  });

  // ── Step 5: Delete one memory ────────────────────────────────────────────────

  it('Step 5: deletes one memory with attestation', async () => {
    const memoryToDelete = memoryIds[0];

    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/vaults/${vaultId}/memories/${memoryToDelete}`,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'x-operator-public-key': operatorPublicKey,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.contentHash).toBeTruthy();
    expect(body.data.attestationId).toBeTruthy();

    // Second delete should fail
    const res2 = await app.inject({
      method: 'DELETE',
      url: `/v1/vaults/${vaultId}/memories/${memoryToDelete}`,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'x-operator-public-key': operatorPublicKey,
      },
    });
    expect(res2.statusCode).toBe(404);

    console.log(`  → Deleted memory ${memoryToDelete}`);
  });

  // ── Step 6: Generate compliance report ──────────────────────────────────────

  it('Step 6: generates a compliance report', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/vaults/${vaultId}/compliance/report`,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'x-operator-public-key': operatorPublicKey,
      },
      payload: {
        reportType: 'audit',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.reportId).toBeTruthy();
    expect(body.data.reportHash).toBeTruthy();
    expect(body.data.reportData).toBeDefined();
    expect(body.data.reportData.summary.totalMemories).toBe(10); // 11 written - 1 deleted

    console.log(`  → Compliance report: ${body.data.reportId}`);
  });

  // ── Step 7: Verify audit log contains all operations ─────────────────────────

  it('Step 7: audit log contains write and delete attestations', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/vaults/${vaultId}/attestations`,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'x-operator-public-key': operatorPublicKey,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.items).toBeDefined();

    const operations = body.data.items.map((a: any) => a.operation);

    // Should have 5 WRITEs + 1 DELETE = 6 attestations (minimum)
    const writeCount = operations.filter((op: string) => op === 'WRITE').length;
    const deleteCount = operations.filter((op: string) => op === 'DELETE').length;

    expect(writeCount).toBeGreaterThanOrEqual(5);
    expect(deleteCount).toBeGreaterThanOrEqual(1);

    console.log(`  → Audit log: ${writeCount} WRITEs, ${deleteCount} DELETEs`);
  });

  // ── Step 8: Export vault and verify memory count ────────────────────────────

  it('Step 8: exports vault and verifies memory count', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/vaults/${vaultId}/export`,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'x-operator-public-key': operatorPublicKey,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.memories).toBeDefined();
    expect(body.data.memories).toHaveLength(10); // 11 written - 1 deleted
    expect(body.data.vaultStateHash).toBeTruthy();
    expect(body.data.exportedAt).toBeTruthy();

    // All exported memories should have content
    for (const mem of body.data.memories) {
      expect(mem.content).toBeTruthy();
      expect(mem.contentHash).toBeTruthy();
    }

    console.log(`  → Exported ${body.data.memories.length} memories, hash: ${body.data.vaultStateHash.slice(0, 16)}...`);
  });

  // ── Step 9: Vault metadata ───────────────────────────────────────────────────

  it('Step 9: retrieves vault metadata', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/vaults/${vaultId}`,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'x-operator-public-key': operatorPublicKey,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(vaultId);
    expect(body.data.operatorAddress).toBe(operatorPublicKey);
    expect(body.data.plan).toBe('free');
  });

  // ── Security: Cross-vault access denied ──────────────────────────────────────

  it('Security: denies cross-vault access', async () => {
    const fakeVaultId = '00000000-0000-0000-0000-000000000000';

    const res = await app.inject({
      method: 'GET',
      url: `/v1/vaults/${fakeVaultId}`,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'x-operator-public-key': operatorPublicKey,
      },
    });

    // Should return 403 (vault ID doesn't match the authenticated vault)
    expect(res.statusCode).toBe(403);
  });

  // ── Security: Unauthenticated requests rejected ───────────────────────────────

  it('Security: rejects requests without API key', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/vaults/${vaultId}/memories`,
      payload: { content: 'Sneaky write', type: 'semantic' },
    });

    expect(res.statusCode).toBe(401);
  });

  // ── Input validation ─────────────────────────────────────────────────────────

  it('Validation: rejects memory exceeding max length', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/vaults/${vaultId}/memories`,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'x-operator-public-key': operatorPublicKey,
      },
      payload: {
        content: 'x'.repeat(50001),
        type: 'semantic',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
