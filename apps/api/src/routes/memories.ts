import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { memoryService } from '../services/memory.service.js';
import { consolidationService } from '../services/consolidation.service.js';
import { authMiddleware, requireVaultMatch } from '../middleware/auth.js';
import { successResponse, errorResponse } from '@mneme/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Validation Schemas
// ─────────────────────────────────────────────────────────────────────────────

const ALL_MEMORY_TYPES = ['working', 'episodic', 'semantic', 'procedural', 'relational'] as const;
const TASK_TYPES = ['fact_lookup', 'episodic_recall', 'procedural_lookup', 'general'] as const;

const WriteMemorySchema = z.object({
  content:     z.string().min(1).max(50000).transform(s => s.replace(/\0/g, '')),
  type:        z.enum(ALL_MEMORY_TYPES).optional().default('episodic'), // soft hint; classifier overrides
  hint_type:   z.enum(ALL_MEMORY_TYPES).optional(), // hard override passed to classifier
  task_scope:  z.string().max(500).optional(),
  tags:        z.array(z.string().max(100)).max(50).optional(),
  importance:  z.number().min(0).max(1).optional(),
  sessionId:   z.string().uuid().optional(),
  sourceModel: z.string().max(100).optional(),
});

const RecallSchema = z.object({
  query:         z.string().min(1).max(1000),
  limit:         z.number().int().min(1).max(100).optional(),
  types:         z.array(z.enum(ALL_MEMORY_TYPES)).optional(),
  before:        z.string().datetime().optional(),
  after:         z.string().datetime().optional(),
  includeGraph:  z.boolean().optional(),
  // Phase 2/3 additions
  budget_tokens:   z.number().int().min(1).max(100000).optional(),
  budget_strategy: z.enum(['strict', 'flexible']).optional().default('strict'),
  task_scope:      z.string().max(500).optional(),
  task_type:       z.enum(TASK_TYPES).optional(),
});

const InspectSchema = z.object({
  timestamp: z.string().datetime(),
  query:     z.string().optional(),
});

const ListQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

export async function memoryRoutes(fastify: FastifyInstance) {
  const VAULT_PREFIX = '/vaults/:vaultId/memories';

  // ── POST /vaults/:vaultId/memories/batch — atomic batch import ─────────────
  const BatchImportSchema = z.object({
    memories: z.array(WriteMemorySchema).min(1).max(500),
  });

  fastify.post(`${VAULT_PREFIX}/batch`,
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId } = request.params as { vaultId: string };
      const body = BatchImportSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Invalid batch import input',
          details: body.error.flatten(),
        }));
      }

      const items = body.data.memories;
      const results: string[] = [];
      const errors: Array<{ index: number; message: string }> = [];

      // Process each memory individually — errors are collected, not thrown
      for (let i = 0; i < items.length; i++) {
        try {
          const input = {
            content:     items[i].content,
            type:        items[i].type ?? 'episodic',
            hintType:    items[i].hint_type,
            taskScope:   items[i].task_scope,
            tags:        items[i].tags,
            importance:  items[i].importance,
            sessionId:   items[i].sessionId,
            sourceModel: items[i].sourceModel ?? 'batch-import',
          };
          const result = await memoryService.write(vaultId, input);
          results.push(result.memory.id);
        } catch (err: any) {
          errors.push({ index: i, message: err.message });
        }
      }

      return reply.status(errors.length === items.length ? 400 : 201).send(successResponse({
        imported: results.length,
        failed: errors.length,
        memoryIds: results,
        errors,
      }));
    }
  );

  // ── POST /vaults/:vaultId/memories — write memory ─────────────────────────
  fastify.post(VAULT_PREFIX,
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId } = request.params as { vaultId: string };
      const body = WriteMemorySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Invalid memory input',
          details: body.error.flatten(),
        }));
      }

      // Map snake_case API body to camelCase service input
      const input = {
        content:     body.data.content,
        type:        body.data.type ?? 'episodic',
        hintType:    body.data.hint_type,
        taskScope:   body.data.task_scope,
        tags:        body.data.tags,
        importance:  body.data.importance,
        sessionId:   body.data.sessionId,
        sourceModel: body.data.sourceModel,
      };

      const result = await memoryService.write(vaultId, input);
      return reply.status(201).send(successResponse({
        ...result,
        // Expose classification metadata to caller
        classifiedType: result.classifiedType,
        hintTypeUsed:   result.hintTypeUsed,
      }));
    }
  );

  // ── GET /vaults/:vaultId/memories — list memories ─────────────────────────
  fastify.get(VAULT_PREFIX,
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId } = request.params as { vaultId: string };
      const query = ListQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.status(400).send(errorResponse({ code: 'VALIDATION_ERROR', message: 'Invalid query params' }));
      }
      const result = await memoryService.list(vaultId, query.data.page, query.data.limit);
      return reply.send(successResponse(result));
    }
  );

  // ── POST /vaults/:vaultId/memories/recall — two-stage semantic search ─────
  fastify.post(`${VAULT_PREFIX}/recall`,
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId } = request.params as { vaultId: string };
      const body = RecallSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Invalid recall input',
          details: body.error.flatten(),
        }));
      }

      // Map snake_case API fields to camelCase service input
      const input = {
        query:        body.data.query,
        limit:        body.data.limit,
        types:        body.data.types,
        before:       body.data.before,
        after:        body.data.after,
        includeGraph: body.data.includeGraph,
        budgetTokens:   body.data.budget_tokens,
        budgetStrategy: body.data.budget_strategy,
        taskScope:      body.data.task_scope,
        taskType:       body.data.task_type,
      };

      const result = await memoryService.recall(vaultId, input);
      return reply.send(successResponse(result));
    }
  );

  // ── POST /vaults/:vaultId/memories/inspect — temporal query ───────────────
  fastify.post(`${VAULT_PREFIX}/inspect`,
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId } = request.params as { vaultId: string };
      const body = InspectSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse({ code: 'VALIDATION_ERROR', message: 'Invalid inspect input' }));
      }
      const result = await memoryService.inspect(vaultId, body.data);
      return reply.send(successResponse(result));
    }
  );

  // ── DELETE /vaults/:vaultId/memories/:memoryId — delete memory ───────────
  fastify.delete(`${VAULT_PREFIX}/:memoryId`,
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId, memoryId } = request.params as { vaultId: string; memoryId: string };
      try {
        const result = await memoryService.delete(vaultId, memoryId);
        return reply.send(successResponse(result));
      } catch (err: any) {
        if (err.message === 'MEMORY_NOT_FOUND' || err.message === 'MEMORY_DELETED') {
          return reply.status(404).send(errorResponse({ code: 'MEMORY_NOT_FOUND', message: 'Memory not found or already deleted' }));
        }
        throw err;
      }
    }
  );

  // ── POST /vaults/:vaultId/sessions/:sessionId/consolidate ────────────────
  fastify.post('/vaults/:vaultId/sessions/:sessionId/consolidate',
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId, sessionId } = request.params as { vaultId: string; sessionId: string };
      try {
        await consolidationService.consolidateSession(vaultId, sessionId);
        return reply.send(successResponse({ success: true }));
      } catch (err: any) {
        return reply.status(500).send(errorResponse({ code: 'INTERNAL_ERROR', message: err.message }));
      }
    }
  );

  // ── GET /vaults/:vaultId/graph — knowledge graph for the vault ────────────
  // Called by the frontend's graph visualisation panel.
  // Returns { nodes: [...], links: [...] } using Neo4j when available, or
  // a tag co-occurrence graph built from PostgreSQL as a fallback.
  fastify.get('/vaults/:vaultId/graph',
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId } = request.params as { vaultId: string };
      try {
        const { graphService } = await import('../services/graph.service.js');
        const graph = await graphService.getVaultGraph(vaultId);
        return reply.send(successResponse(graph));
      } catch (err: any) {
        return reply.status(500).send(errorResponse({ code: 'INTERNAL_ERROR', message: err.message }));
      }
    }
  );
}
