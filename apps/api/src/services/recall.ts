import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { decrypt, deriveVaultKey } from '@mneme/shared';
import type {
  RecallMemoryInput,
  RecallResult,
  Memory as MemoryType,
  TaskType,
} from '@mneme/shared';
import {
  CLASSIFIER_WEIGHTS,
  DISTRACTOR_DEFAULTS,
  DEFAULT_BUDGET_TOKENS,
} from '@mneme/shared';
import { embeddingService } from './embedding.service.js';
import { llmService } from './llm.service.js';
import { rerankerService } from './reranker.service.js';
import { graphService } from './graph.service.js';
import { createLogger } from '../utils/logger.js';
import { encoding_for_model, type Tiktoken } from 'tiktoken';

function getEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('ENCRYPTION_SECRET is missing or too short — cannot decrypt memories for recall.');
  }
  return secret;
}


const logger = createLogger('recall-service');

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RawMemoryRow {
  id: string;
  vault_id: string;
  type: string;
  content: string;
  content_iv: string;
  content_tag: string;
  tags: string[];
  importance: number;
  source_model: string | null;
  session_id: string | null;
  valid_from: Date;
  valid_until: Date | null;
  created_at: Date;
  deleted_at: Date | null;
  content_hash: string;
  provenance_pack_id: string | null;
  task_scope: string | null;
  segment_id: string | null;
  token_count: number;
  embedding: number[] | null;
  similarity: number | null; // from cosine search
  decay_rate: number;
}

interface ScoredMemory {
  row: RawMemoryRow;
  plaintext: string;
  similarity: number;
  compositeScore: number;
  taskContextualFit: number;
  isDistractor: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────



/** Cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : Math.min(1, dot / denom);
}

function isZeroVector(v: number[]): boolean {
  return v.every(x => x === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage functions
// ─────────────────────────────────────────────────────────────────────────────

import { RETRIEVAL_STRATEGY } from './memory.service.js';

/**
 * Normalised recency score: exponential decay
 */
function recencyScore(createdAt: Date, decayRate: number = 0.1): number {
  const ageMs = Date.now() - createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.exp(-decayRate * ageDays);
}

/**
 * Stage 1 — Composite scoring.
 * score = sem*similarity + rec*recency + imp*importance
 */
function compositeScore(
  similarity: number,
  recency: number,
  importance: number,
  memoryType: MemoryType['type']
): number {
  const weights = RETRIEVAL_STRATEGY[memoryType].weights;
  return (
    weights.similarity * similarity +
    weights.recency * recency +
    weights.importance * importance
  );
}

/**
 * Stage 2 — Distractor filter.
 * A memory is a distractor when it is semantically similar to the query
 * but doesn't fit the task context.
 */
function isDistractor(
  similarity: number,
  taskContextualFit: number,
  simThreshold: number,
  fitThreshold: number,
): boolean {
  return similarity > simThreshold && taskContextualFit < fitThreshold;
}

/**
 * Stage 3 — Token budget knapsack.
 * Enforces BUDGET_ALLOCATION (Segments 35%, key memories 45%, 20% margin).
 * Contextually compresses memories if strategy is strict and budget is tight.
 */
async function selectWithinBudget(
  query: string,
  candidates: ScoredMemory[],
  budgetTokens: number,
  strategy: 'strict' | 'flexible',
  tokenizer: Tiktoken,
): Promise<{ selected: ScoredMemory[]; totalTokens: number }> {
  // Sort descending by score
  const sorted = [...candidates].sort((a, b) => b.compositeScore - a.compositeScore);

  const segmentBudget = Math.floor(budgetTokens * 0.35);
  const memoryBudget = Math.floor(budgetTokens * 0.45);
  // 20% margin left over

  const selected: ScoredMemory[] = [];
  let totalSegmentTokens = 0;
  let totalMemoryTokens = 0;

  for (const candidate of sorted) {
    const isSegment = candidate.row.segment_id !== null;
    const tokens = tokenizer.encode(candidate.plaintext).length;
    
    // Update token_count with accurate tiktoken count
    candidate.row.token_count = tokens;

    let targetTokens = 0;
    if (isSegment) {
      if (totalSegmentTokens + tokens <= segmentBudget) {
        selected.push(candidate);
        totalSegmentTokens += tokens;
      } else if (strategy === 'strict') {
        const allowed = segmentBudget - totalSegmentTokens;
        if (allowed > 50) { // arbitrary minimum useful size
          candidate.plaintext = await llmService.compressMemory(candidate.plaintext, query, allowed);
          candidate.row.token_count = tokenizer.encode(candidate.plaintext).length;
          selected.push(candidate);
          totalSegmentTokens += candidate.row.token_count;
        }
      }
    } else {
      if (totalMemoryTokens + tokens <= memoryBudget) {
        selected.push(candidate);
        totalMemoryTokens += tokens;
      } else if (strategy === 'strict') {
        const allowed = memoryBudget - totalMemoryTokens;
        if (allowed > 50) {
          candidate.plaintext = await llmService.compressMemory(candidate.plaintext, query, allowed);
          candidate.row.token_count = tokenizer.encode(candidate.plaintext).length;
          selected.push(candidate);
          totalMemoryTokens += candidate.row.token_count;
        }
      }
    }
  }

  return { selected, totalTokens: totalSegmentTokens + totalMemoryTokens };
}

// ─────────────────────────────────────────────────────────────────────────────
// RecallService
// ─────────────────────────────────────────────────────────────────────────────

export class RecallService {
  private tokenizer: Tiktoken;

  constructor() {
    this.tokenizer = encoding_for_model('gpt-4o-mini');
  }

  async recall(
    vaultId: string,
    input: RecallMemoryInput,
  ): Promise<RecallResult> {

    const taskType: TaskType = input.taskType ?? 'general';
    const budgetTokens = input.budgetTokens ?? DEFAULT_BUDGET_TOKENS;
    const limit = input.limit ?? 50; // Fetch more candidates than we'll return
    const vaultKey = deriveVaultKey(getEncryptionSecret(), vaultId);

    // ── Generate HyDE Query & Embed ─────────────────────────────────────────
    let queryEmbedding: number[] | null = null;
    let useVectorSearch = false;
    let hydeQuery = input.query;
    
    try {
      // 1. Generate hypothetical document to match the target vector space
      hydeQuery = await llmService.generateHyDE(input.query, taskType);
      
      // 2. Embed the hypothetical document
      const raw = await embeddingService.embed(hydeQuery);
      if (!isZeroVector(raw)) {
        queryEmbedding = raw;
        useVectorSearch = true;
      }
    } catch (err) {
      logger.warn({ err }, 'HyDE/Query embedding failed — falling back to importance ordering');
    }

    // ── We no longer embed task_scope here, Reranker uses raw text ──────────
    let taskScopeEmbedding: number[] | null = null;
    const taskScopeStr = input.taskScope ?? null;
    if (taskScopeStr && useVectorSearch) {
      try {
        const raw = await embeddingService.embed(taskScopeStr);
        if (!isZeroVector(raw)) taskScopeEmbedding = raw;
      } catch {
        // Optional — distractor filter will use neutral fit if unavailable
      }
    }

    // ── Stage 1a: Fetch candidates from DB (Typed Routing) ─────────────────
    let rows: RawMemoryRow[] = [];
    const requestedTypes = input.types ? new Set<string>(input.types) : new Set<string>(['episodic', 'semantic', 'procedural', 'working', 'relational']);

    // Fetch from Postgres (Episodic, Working, and Fallback for others)
    // In a fully distributed setup, Semantic would exclusively query Neo4j and Procedural exclusively Redis.
    // Since Postgres is our source of truth, we fetch all requested types from pgvector.
    
    if (useVectorSearch && queryEmbedding) {
      const embStr = `[${queryEmbedding.join(',')}]`;
      const typesArray = Array.from(requestedTypes);
      const rawRows = await db.execute(sql`
        SELECT *,
               1 - (embedding <=> ${embStr}::vector) AS similarity
        FROM memories
        WHERE vault_id   = ${vaultId}
          AND type       IN (${sql.join(typesArray.map(t => sql`${t}`), sql`, `)})
          AND deleted_at IS NULL
          AND embedding  IS NOT NULL
          AND (valid_until IS NULL OR valid_until > NOW())
          ${input.before ? sql`AND valid_from <= ${input.before}` : sql``}
          ${input.after  ? sql`AND valid_from >= ${input.after}`  : sql``}
        ORDER BY embedding <=> ${embStr}::vector
        LIMIT ${limit * 3}
      `);
      rows = rawRows as unknown as RawMemoryRow[];
    } else {
      const typesArray = Array.from(requestedTypes);
      const rawRows = await db.execute(sql`
        SELECT *, NULL AS similarity
        FROM memories
        WHERE vault_id   = ${vaultId}
          AND type       IN (${sql.join(typesArray.map(t => sql`${t}`), sql`, `)})
          AND deleted_at IS NULL
          AND (valid_until IS NULL OR valid_until > NOW())
          ${input.before ? sql`AND valid_from <= ${input.before}` : sql``}
          ${input.after  ? sql`AND valid_from >= ${input.after}`  : sql``}
        ORDER BY importance DESC, created_at DESC
        LIMIT ${limit * 3}
      `);
      rows = rawRows as unknown as RawMemoryRow[];
    }

    // Fetch graph facts if semantic/relational types are requested and Neo4j is available
    if (graphService.isAvailableSync() && (requestedTypes.has('semantic') || requestedTypes.has('relational'))) {
      try {
        const graphFacts = await graphService.getFactsAt(vaultId, new Date());
        for (const fact of graphFacts) {
          const pseudoRow: RawMemoryRow = {
            id: fact.sourceMemoryId || `graph-${Math.random().toString(36).slice(2)}`,
            vault_id: vaultId,
            type: 'semantic',
            content: `Graph Fact: ${fact.subject} ${fact.predicate} ${fact.object}`,
            content_iv: '',
            content_tag: '',
            tags: ['graph-fact'],
            importance: fact.confidence,
            source_model: null,
            session_id: null,
            valid_from: new Date(fact.validFrom),
            valid_until: fact.validUntil ? new Date(fact.validUntil) : null,
            created_at: new Date(fact.validFrom),
            deleted_at: null,
            content_hash: 'graph-fact-hash',
            provenance_pack_id: null,
            task_scope: null,
            segment_id: null,
            token_count: 0,
            embedding: null,
            similarity: 0.85, // Default baseline for distractor filter
            decay_rate: 0.1,
          };
          rows.push(pseudoRow);
        }
      } catch (err) {
        logger.warn({ err }, 'Failed to fetch graph facts for recall hydration');
      }
    }

    const stage1Candidates = rows.length;

    // ── Stage 1b: Composite scoring ─────────────────────────────────────────

    const scored: ScoredMemory[] = [];

    for (const row of rows) {
      // Decrypt — skip if decryption fails or if it's a plain graph fact
      let plaintext: string;
      if (row.content_hash === 'graph-fact-hash') {
        plaintext = row.content;
      } else {
        try {
          plaintext = decrypt(
            { ciphertext: row.content, iv: row.content_iv, tag: row.content_tag },
            vaultKey,
          );
        } catch (err) {
          logger.error({ err, memoryId: row.id }, 'Decryption failed — skipping row');
          continue;
        }
      }

      const sim = typeof row.similarity === 'number' ? row.similarity : 0.5;
      const rec = recencyScore(new Date(row.created_at), row.decay_rate ?? 0.1);
      const imp = row.importance ?? 0.5;

      // Compute cScore
      const cScore = compositeScore(sim, rec, imp, row.type as MemoryType['type']);
      
      scored.push({
        row,
        plaintext,
        similarity: sim,
        compositeScore: cScore,
        taskContextualFit: DISTRACTOR_DEFAULTS.neutralFit, // Updated in Stage 2
        isDistractor: false,
      });
    }

    // ── Stage 2: Distractor filter via CrossEncoder Reranker ────────────────
    
    // Send all candidates to the Python Reranker service
    if (scored.length > 0) {
      const docsToRerank = scored.map(s => ({
        id: s.row.id,
        text: `Scope: ${s.row.task_scope || 'General'}\nContent: ${s.plaintext}`
      }));
      
      try {
        const rerankResults = await rerankerService.rerank(input.query, docsToRerank);
        const rerankMap = new Map(rerankResults.map(r => [r.id, r.score]));
        
        for (const candidate of scored) {
          // Cross-encoder score typically ranges -10 to 10 depending on the model,
          // but we can normalize or use it directly for sorting/filtering.
          // For now, we will consider a negative score as a distractor if similarity was high.
          const fitScore = rerankMap.get(candidate.row.id) ?? DISTRACTOR_DEFAULTS.neutralFit;
          candidate.taskContextualFit = fitScore;
          
          // Distractor threshold (e.g. if the cross-encoder thinks it is terrible (< 0))
          // while vector search similarity was high.
          candidate.isDistractor = candidate.similarity > DISTRACTOR_DEFAULTS.simThreshold && fitScore < 0;
        }
      } catch (err) {
        logger.warn({ err }, 'CrossEncoder reranking failed — keeping all candidates');
      }
    }

    const stage2Removed = scored.filter(s => s.isDistractor).length;
    const afterStage2   = scored.filter(s => !s.isDistractor);

    // ── Stage 3: Token budget knapsack ──────────────────────────────────────
    const strategy = input.budgetStrategy ?? 'strict';
    const { selected, totalTokens } = await selectWithinBudget(input.query, afterStage2, budgetTokens, strategy, this.tokenizer);

    // Map to public Memory type
    const memories: MemoryType[] = selected.map(s => this.toMemoryType(s.row, s.plaintext));

    // Phase 4: Reinforce recalled memories asynchronously
    if (memories.length > 0) {
      setImmediate(() => {
        import('./memory.service.js').then(({ memoryService }) => {
          memoryService.reinforceMemories(vaultId, memories.map(m => m.id)).catch(() => {});
        }).catch(() => {});
      });
    }

    return {
      memories,
      totalFound: memories.length,
      // Stage metadata
      totalTokensUsed:    totalTokens,
      budgetTokens,
      filteredCount:      stage1Candidates,
      stage1Candidates,
      stage2Removed,
      taskScopeDetected: taskScopeStr ?? undefined,
    };
  }

  // ── Helper ─────────────────────────────────────────────────────────────────

  private toMemoryType(row: RawMemoryRow, plaintext: string): MemoryType {
    return {
      id:               row.id,
      vaultId:          row.vault_id,
      type:             row.type as MemoryType['type'],
      content:          plaintext,
      tags:             row.tags ?? [],
      importance:       row.importance ?? 0.5,
      sourceModel:      row.source_model ?? undefined,
      sessionId:        row.session_id ?? undefined,
      validFrom:        new Date(row.valid_from).toISOString(),
      validUntil:       row.valid_until ? new Date(row.valid_until).toISOString() : undefined,
      createdAt:        new Date(row.created_at).toISOString(),
      deletedAt:        row.deleted_at ? new Date(row.deleted_at).toISOString() : undefined,
      contentHash:      row.content_hash,
      provenancePackId: row.provenance_pack_id ?? undefined,
      taskScope:        row.task_scope ?? undefined,
      tokenCount:       row.token_count ?? 0,
    };
  }
}

export const recallService = new RecallService();
