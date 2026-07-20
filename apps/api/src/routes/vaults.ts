import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { vaultService } from '../services/vault.service.js';
import { memoryService } from '../services/memory.service.js';
import { complianceService } from '../services/compliance.service.js';
import { authMiddleware, requireVaultMatch } from '../middleware/auth.js';
import { successResponse, errorResponse } from '@mneme/shared';

const CreateVaultSchema = z.object({
  operatorAddress: z.string().min(1),
  name: z.string().optional(),
  network: z.string().optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  serviceEndpoint: z.string().url().optional(),
});

const ExportQuerySchema = z.object({
  format: z.enum(['mneme', 'mem0', 'zep']).optional(),
});

export async function vaultRoutes(fastify: FastifyInstance) {
  // POST /vaults — create vault
  fastify.post('/vaults', async (request, reply) => {
    const body = CreateVaultSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: body.error.flatten(),
      }));
    }

    const { vault, apiKey } = await vaultService.create(body.data);
    return reply.status(201).send(successResponse({ vault, apiKey }));
  });

  // GET /vaults/:vaultId — get vault metadata
  fastify.get('/vaults/:vaultId',
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId } = request.params as { vaultId: string };
      const vault = await vaultService.getById(vaultId);
      if (!vault) return reply.status(404).send(errorResponse({ code: 'VAULT_NOT_FOUND', message: 'Vault not found' }));
      return reply.send(successResponse(vault));
    }
  );

  // DELETE /vaults/:vaultId — destroy vault
  fastify.delete('/vaults/:vaultId',
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId } = request.params as { vaultId: string };
      await vaultService.destroy(vaultId);
      return reply.send(successResponse({ destroyed: true }));
    }
  );

  // GET /vaults/:vaultId/export — export full vault
  fastify.get('/vaults/:vaultId/export',
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId } = request.params as { vaultId: string };
      const result = await memoryService.export(vaultId);
      return reply.send(successResponse(result));
    }
  );

  const SnapshotQuerySchema = z.object({
    maxTokens: z.coerce.number().int().min(100).max(10000).optional().default(2000),
  });

  // GET /vaults/:vaultId/snapshot — get compressed system prompt for GPT injection
  fastify.get('/vaults/:vaultId/snapshot',
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId } = request.params as { vaultId: string };
      const query = SnapshotQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.status(400).send(errorResponse({ code: 'VALIDATION_ERROR', message: 'Invalid query params' }));
      }
      
      // Perform a general recall with flexible knapsack up to maxTokens
      const result = await memoryService.recall(vaultId, {
        query: 'General context and core identity of the user.',
        limit: 50,
        budgetTokens: query.data.maxTokens,
        budgetStrategy: 'flexible', // Phase 3 token budget strategy
        taskType: 'general',
      });

      // Format as an injected system prompt string
      const prompt = `[MNEME SOVEREIGN MEMORY]\n` +
        result.memories.map(m => `- ${m.content}`).join('\n');

      return reply.send(successResponse({ prompt, tokenEstimate: result.totalTokensUsed }));
    }
  );

  // POST /vaults/:vaultId/keys/rotate — rotate API key
  fastify.post('/vaults/:vaultId/keys/rotate',
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId } = request.params as { vaultId: string };
      const newKey = await vaultService.rotateApiKey(vaultId);
      return reply.send(successResponse({ apiKey: newKey }));
    }
  );
}
