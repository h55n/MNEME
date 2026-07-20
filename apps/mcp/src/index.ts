#!/usr/bin/env node
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { MCP_TOOLS } from '@mneme/shared';

// ── API Client ────────────────────────────────────────────────────────────────

const API_BASE = process.env.MNEME_API_URL ?? 'http://localhost:3001/v1';
const API_KEY = process.env.MNEME_API_KEY ?? '';
const VAULT_ID = process.env.MNEME_VAULT_ID ?? '';
const OPERATOR_PUBLIC_KEY = process.env.MNEME_OPERATOR_PUBLIC_KEY ?? '';

async function apiCall<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      'X-Operator-Public-Key': OPERATOR_PUBLIC_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json()) as { success: boolean; data?: T; error?: { message: string } };

  if (!data.success) {
    throw new McpError(
      ErrorCode.InternalError,
      data.error?.message ?? 'API request failed',
    );
  }

  return data.data as T;
}

// ── Tool Schemas ──────────────────────────────────────────────────────────────

const WriteSchema = z.object({
  content:    z.string().min(1).describe('Memory content to store'),
  type:       z.enum(['working', 'episodic', 'semantic', 'procedural', 'relational']).optional().describe('Suggested memory type (classifier may override)'),
  hint_type:  z.enum(['working', 'episodic', 'semantic', 'procedural', 'relational']).optional().describe('Hard type override — bypasses classifier'),
  task_scope: z.string().optional().describe('Task context scope (e.g. "billing", "coding")'),
  tags:       z.array(z.string()).optional().describe('Optional tags for categorisation'),
  importance: z.number().min(0).max(1).optional().describe('Importance score 0-1'),
  sessionId:  z.string().optional().describe('Optional session identifier'),
});

const RecallSchema = z.object({
  query:         z.string().min(1).describe('Natural language query to search memories'),
  limit:         z.number().int().min(1).max(100).optional().describe('Max results (default 10)'),
  types:         z.array(z.enum(['working', 'episodic', 'semantic', 'procedural', 'relational'])).optional(),
  before:        z.string().optional().describe('ISO datetime — only memories before this time'),
  after:         z.string().optional().describe('ISO datetime — only memories after this time'),
  // Phase 2 additions
  budget_tokens: z.number().int().min(1).max(100000).optional().describe('Max tokens to return (enables knapsack selection)'),
  task_scope:    z.string().optional().describe('Current task context (e.g. "billing") — activates distractor filter'),
  task_type:     z.enum(['fact_lookup', 'episodic_recall', 'procedural_lookup', 'general']).optional().describe('Task type for composite scoring weights'),
});

const ForgetSchema = z.object({
  memoryId: z.string().uuid().describe('ID of the memory to delete'),
});

const InspectSchema = z.object({
  timestamp: z.string().describe('ISO datetime — query vault state at this historical moment'),
  query: z.string().optional().describe('Optional filter query'),
});

const ExportSchema = z.object({
  format: z.enum(['mneme', 'mem0', 'zep']).optional().describe('Export format (default: mneme)'),
});

const ImportSchema = z.object({
  format: z.enum(['mem0', 'zep', 'letta', 'mneme']).describe('Source format'),
  data: z.record(z.unknown()).describe('Imported memory data object'),
});

// ── Tool Definitions ──────────────────────────────────────────────────────────

const TOOL_DEFINITIONS = [
  {
    name: MCP_TOOLS.MEMORY_WRITE,
    description:
      'Store a memory in the agent\'s sovereign MNEME vault. ' +
      'The classifier automatically determines the correct memory type. ' +
      'Use hint_type to force a specific type. Use task_scope to tag memories with their task context.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        content: { type: 'string', description: 'Memory content to store' },
        type: {
          type: 'string',
          enum: ['working', 'episodic', 'semantic', 'procedural', 'relational'],
          description: 'Suggested memory type (classifier may override)',
        },
        hint_type: {
          type: 'string',
          enum: ['working', 'episodic', 'semantic', 'procedural', 'relational'],
          description: 'Hard type override — bypasses classifier entirely',
        },
        task_scope: {
          type: 'string',
          description: 'Task context string (e.g. "billing", "coding") — used by distractor filter on recall',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional categorisation tags',
        },
        importance: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Importance score 0-1 (default 0.5)',
        },
        sessionId: { type: 'string', description: 'Optional session ID' },
      },
      required: ['content'],
    },
  },
  {
    name: MCP_TOOLS.MEMORY_RECALL,
    description:
      'Retrieve relevant memories using the two-stage retrieval pipeline: ' +
      'composite scoring (Stage 1) + distractor filter (Stage 2) + token budget knapsack (Stage 3). ' +
      'Provide task_scope to activate the distractor filter and get context-accurate results.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query:  { type: 'string', description: 'Natural language search query' },
        limit:  { type: 'number', description: 'Max candidates to score (default 50, max 100)' },
        types: {
          type: 'array',
          items: { type: 'string', enum: ['working', 'episodic', 'semantic', 'procedural', 'relational'] },
          description: 'Filter by memory type',
        },
        before:        { type: 'string', description: 'ISO datetime upper bound' },
        after:         { type: 'string', description: 'ISO datetime lower bound' },
        budget_tokens: { type: 'number', description: 'Token budget — limits returned memories to fit within this count' },
        task_scope:    { type: 'string', description: 'Task context — activates Stage 2 distractor filter' },
        task_type: {
          type: 'string',
          enum: ['fact_lookup', 'episodic_recall', 'procedural_lookup', 'general'],
          description: 'Task type — selects composite scoring weights',
        },
      },
      required: ['query'],
    },
  },
  {
    name: MCP_TOOLS.MEMORY_FORGET,
    description:
      'Permanently delete a specific memory from the vault. ' +
      'Generates an on-chain cryptographic proof of deletion on Monad.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        memoryId: { type: 'string', description: 'UUID of the memory to delete' },
      },
      required: ['memoryId'],
    },
  },
  {
    name: MCP_TOOLS.MEMORY_INSPECT,
    description:
      'Query the agent\'s memory state at a specific historical timestamp. ' +
      'Answers "what did this agent know on date X?" — useful for audit and compliance.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        timestamp: {
          type: 'string',
          description: 'ISO datetime — inspect vault state at this point in time',
        },
        query: {
          type: 'string',
          description: 'Optional filter to narrow results within the temporal snapshot',
        },
      },
      required: ['timestamp'],
    },
  },
  {
    name: MCP_TOOLS.MEMORY_EXPORT,
    description:
      'Export the complete vault in an open, portable format. ' +
      'Includes all memories, metadata, and a Monad on-chain proof of completeness.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        format: {
          type: 'string',
          enum: ['mneme', 'mem0', 'zep'],
          description: 'Export format (default: mneme open format)',
        },
      },
    },
  },
  {
    name: MCP_TOOLS.MEMORY_IMPORT,
    description:
      'Import memories from another system (Mem0, Zep, Letta, or MNEME export) ' +
      'into this vault. Enables zero-loss migration from other memory providers.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        format: {
          type: 'string',
          enum: ['mem0', 'zep', 'letta', 'mneme'],
          description: 'Source format',
        },
        data: {
          type: 'object',
          description: 'The imported memory data',
        },
      },
      required: ['format', 'data'],
    },
  },
];

// ── Server ────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error('MNEME_API_KEY is required. Set it in your environment.');
    process.exit(1);
  }
  if (!VAULT_ID) {
    console.error('MNEME_VAULT_ID is required. Set it in your environment.');
    process.exit(1);
  }

  const server = new Server(
    { name: 'mneme-memory', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  // ── List Tools ──────────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS,
  }));

  // ── Call Tool ───────────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        // ── memory_write ────────────────────────────────────────────────
        case MCP_TOOLS.MEMORY_WRITE: {
          const input = WriteSchema.parse(args);
          const result = await apiCall('POST', `/vaults/${VAULT_ID}/memories`, {
            content:    input.content,
            type:       input.type,
            hint_type:  input.hint_type,
            task_scope: input.task_scope,
            tags:       input.tags,
            importance: input.importance,
            sessionId:  input.sessionId,
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        // ── memory_recall ───────────────────────────────────────────────
        case MCP_TOOLS.MEMORY_RECALL: {
          const input = RecallSchema.parse(args);
          const result = await apiCall('POST', `/vaults/${VAULT_ID}/memories/recall`, {
            query:         input.query,
            limit:         input.limit,
            types:         input.types,
            before:        input.before,
            after:         input.after,
            budget_tokens: input.budget_tokens,
            task_scope:    input.task_scope,
            task_type:     input.task_type,
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        // ── memory_forget ───────────────────────────────────────────────
        case MCP_TOOLS.MEMORY_FORGET: {
          const input = ForgetSchema.parse(args);
          const result = await apiCall('DELETE', `/vaults/${VAULT_ID}/memories/${input.memoryId}`);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        // ── memory_inspect ──────────────────────────────────────────────
        case MCP_TOOLS.MEMORY_INSPECT: {
          const input = InspectSchema.parse(args);
          const result = await apiCall('POST', `/vaults/${VAULT_ID}/memories/inspect`, input);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        // ── memory_export ───────────────────────────────────────────────
        case MCP_TOOLS.MEMORY_EXPORT: {
          ExportSchema.parse(args ?? {});
          const result = await apiCall('GET', `/vaults/${VAULT_ID}/export`);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        // ── memory_import ───────────────────────────────────────────────
        case MCP_TOOLS.MEMORY_IMPORT: {
          const input = ImportSchema.parse(args);
          // Transform imported data to MNEME format and batch-write
          const memories = transformImport(input.format, input.data);
          // Split into batches of 500 (API limit)
          const MAX_BATCH = 500;
          let imported = 0;
          let failed = 0;

          for (let i = 0; i < memories.length; i += MAX_BATCH) {
            const batch = memories.slice(i, i + MAX_BATCH);
            const r = await apiCall('POST', `/vaults/${VAULT_ID}/memories/batch`, { memories: batch });
            imported += r.data.imported;
            failed += r.data.failed;
          }

          return {
            content: [{
              type: 'text',
              text: `Successfully imported ${imported} memories. Failed: ${failed}.`
            }]
          };
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid parameters: ${err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        );
      }
      if (err instanceof McpError) throw err;
      throw new McpError(ErrorCode.InternalError, String(err));
    }
  });

  // ── Start ─────────────────────────────────────────────────────────────────
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MNEME MCP Server running — vault:', VAULT_ID);
}

// ── Import transformation ─────────────────────────────────────────────────────

function transformImport(
  format: string,
  data: Record<string, unknown>,
): Array<{ content: string; type: 'episodic' | 'semantic' | 'procedural'; tags: string[] }> {
  switch (format) {
    case 'mem0': {
      // Mem0 format: { memories: [{ memory: string, categories: string[] }] }
      const mem0Data = data as { memories?: Array<{ memory: string; categories?: string[] }> };
      return (mem0Data.memories ?? []).map(m => ({
        content: m.memory,
        type: 'semantic' as const,
        tags: m.categories ?? ['imported', 'mem0'],
      }));
    }
    case 'zep': {
      // Zep format: { messages: [{ role, content, metadata }] }
      const zepData = data as { messages?: Array<{ role: string; content: string }> };
      return (zepData.messages ?? []).map(m => ({
        content: `[${m.role}]: ${m.content}`,
        type: 'episodic' as const,
        tags: ['imported', 'zep'],
      }));
    }
    case 'letta': {
      // Letta format: { core_memory: string, recall_memory: string[] }
      const lettaData = data as { core_memory?: string; recall_memory?: string[] };
      const memories = [];
      if (lettaData.core_memory) {
        memories.push({ content: lettaData.core_memory, type: 'procedural' as const, tags: ['imported', 'letta', 'core'] });
      }
      for (const m of lettaData.recall_memory ?? []) {
        memories.push({ content: m, type: 'episodic' as const, tags: ['imported', 'letta'] });
      }
      return memories;
    }
    case 'mneme': {
      // MNEME export format
      const mnemeData = data as { memories?: Array<{ content: string; type: string; tags?: string[] }> };
      return (mnemeData.memories ?? []).map(m => ({
        content: m.content,
        type: (m.type as 'episodic' | 'semantic' | 'procedural') ?? 'semantic',
        tags: [...(m.tags ?? []), 'imported', 'mneme'],
      }));
    }
    default:
      return [];
  }
}

main().catch(err => {
  console.error('Fatal MCP server error:', err);
  process.exit(1);
});
