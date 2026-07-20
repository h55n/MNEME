import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { memoryService } from '../services/memory.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { successResponse, errorResponse } from '@mneme/shared';

// ─────────────────────────────────────────────────────────────────────────────
// GPT Validation Schemas
// ─────────────────────────────────────────────────────────────────────────────

const GptWriteSchema = z.object({
  content:   z.string().min(1).max(50000),
  hint_type: z.enum(['working', 'episodic', 'semantic', 'procedural', 'relational']).optional(),
});

const GptRecallSchema = z.object({
  query:         z.string().min(1).max(1000),
  budget_tokens: z.number().int().min(1).max(100000).optional().default(1000),
  task_scope:    z.string().max(500).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// OpenAPI Schema for Custom GPT / Gemini Gem
// ─────────────────────────────────────────────────────────────────────────────

const openApiSchema = `openapi: 3.0.0
info:
  title: MNEME Memory API
  version: 1.0.0
  description: Memory layer for AI agents. Allows the agent to read and write memories for the user.
servers:
  - url: https://api.mneme.dev/v1
paths:
  /gpt/recall:
    post:
      operationId: recallMemory
      summary: Retrieve relevant memories for current conversation turn
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                query: 
                  type: string
                  description: The search query to find memories
                budget_tokens: 
                  type: integer
                  default: 1000
                  description: The maximum tokens to return
                task_scope: 
                  type: string
                  description: The current task context (e.g. 'coding_session', 'general_chat')
      responses:
        '200':
          description: Successful recall
  /gpt/write:
    post:
      operationId: writeMemory
      summary: Store a memory from the current conversation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                content: 
                  type: string
                  description: The memory to store
                hint_type: 
                  type: string
                  enum: [working, episodic, semantic, procedural, relational]
      responses:
        '201':
          description: Memory successfully stored
components:
  securitySchemes:
    ApiKeyAuth:
      type: http
      scheme: bearer
security:
  - ApiKeyAuth: []
`;

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

export async function gptRoutes(fastify: FastifyInstance) {
  
  // ── GET /gpt/openapi.yaml — OpenAPI Spec ────────────────────────────────
  fastify.get('/openapi.yaml', async (request, reply) => {
    reply.type('text/yaml').send(openApiSchema);
  });

  // ── POST /gpt/write — store memory ──────────────────────────────────────
  fastify.post('/write',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const vaultId = request.vaultId!; // injected by authMiddleware
      
      const body = GptWriteSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: body.error.flatten(),
        }));
      }

      const input = {
        content:     body.data.content,
        type:        'episodic' as const, // default prior
        hintType:    body.data.hint_type,
        sourceModel: 'gpt_action',
      };

      const result = await memoryService.write(vaultId, input);
      return reply.status(201).send(successResponse({
        memoryId: result.memory.id,
        classifiedType: result.classifiedType,
      }));
    }
  );

  // ── POST /gpt/recall — two-stage semantic search ────────────────────────
  fastify.post('/recall',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const vaultId = request.vaultId!; // injected by authMiddleware
      
      const body = GptRecallSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: body.error.flatten(),
        }));
      }

      const input = {
        query:        body.data.query,
        budgetTokens: body.data.budget_tokens,
        taskScope:    body.data.task_scope,
      };

      const result = await memoryService.recall(vaultId, input);
      
      // Simplify the response for the LLM
      return reply.send({
        success: true,
        data: {
          memories: result.memories.map(m => `[${m.type.toUpperCase()}] ${m.content}`),
          totalTokensUsed: result.totalTokensUsed,
        }
      });
    }
  );
}
