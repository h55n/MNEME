import { db, memories, attestations } from '../db/index.js';
import { redis } from '../db/redis.js';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import {
  sha256,
  computeVaultStateHash,
  encrypt,
  decrypt,
  deriveVaultKey,
  now,
} from '@mneme/shared';
import type {
  WriteMemoryInput,
  RecallMemoryInput,
  MemoryInspectInput,
  RecallResult,
  Memory as MemoryType,
} from '@mneme/shared';
import { attestationBatcher } from '../blockchain/attestation-batcher.js';
import { embeddingService } from './embedding.service.js';
import { classifierService } from './classifier.js';
import { recallService } from './recall.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('memory-service');

/** Fail-fast accessor for the server-side encryption secret. */
function getEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'ENCRYPTION_SECRET env var is missing or too short (min 32 chars). ' +
      'Refusing to encrypt/decrypt without a real server secret.'
    );
  }
  return secret;
}


export const RETRIEVAL_STRATEGY = {
  episodic: {
    weights: { similarity: 0.3, recency: 0.5, importance: 0.2 },
    store: 'pgvector',
  },
  semantic: {
    weights: { similarity: 0.6, recency: 0.1, importance: 0.3 },
    store: 'neo4j',
  },
  procedural: {
    weights: { similarity: 0.2, recency: 0.1, importance: 0.7 },
    store: 'redis',
  },
  working: {
    weights: { similarity: 0.2, recency: 0.7, importance: 0.1 },
    store: 'pgvector',
  },
  relational: {
    weights: { similarity: 0.5, recency: 0.2, importance: 0.3 },
    store: 'neo4j',
  }
} as const;

// Detect if embedding is a zero-vector (fallback when embedding API is unavailable)
function isZeroVector(embedding: number[]): boolean {
  return embedding.every(v => v === 0);
}

export class MemoryService {

  // -------------------------------------------------------------------------
  // Write
  // -------------------------------------------------------------------------

  async write(
    vaultId: string,
    input: WriteMemoryInput,
  ): Promise<{ memory: MemoryType; contentHash: string; attestationId: string; classifiedType: string; hintTypeUsed: boolean }> {

    // Derive vault encryption key from server-controlled secret
    const vaultKey = deriveVaultKey(getEncryptionSecret(), vaultId);

    // ── Phase 1: Classify memory type ──────────────────────────────────────
    const classification = classifierService.classify(input.content, input.hintType);
    const classifiedType = classification.type;
    const tokenCount = classifierService.estimateTokens(input.content);

    logger.info(
      { vaultId, type: classifiedType, confidence: classification.confidence, method: classification.method },
      'Memory classified',
    );

    // Compute content hash BEFORE encryption
    const contentHash = sha256(input.content);

    // Encrypt content
    const encrypted = encrypt(input.content, vaultKey);

    // Generate embedding for semantic search
    let embedding: number[] | null = null;
    try {
      const raw = await embeddingService.embed(input.content);
      // Only save non-zero vectors — zero vectors indicate fallback/unavailable
      if (!isZeroVector(raw)) {
        embedding = raw;
      }
    } catch (err) {
      logger.warn({ err }, 'Embedding failed — memory written without vector');
    }

    const memoryId = uuidv4();
    let memory: any;

    try {
      // Write to DB — include embedding when available
      const inserted = await db.insert(memories).values({
        id: memoryId,
        vaultId,
        type: classifiedType,          // Use classified type (not raw input.type)
        content: encrypted.ciphertext,
        contentIv: encrypted.iv,
        contentTag: encrypted.tag,
        tags: input.tags ?? [],
        importance: input.importance ?? 0.5,
        sourceModel: input.sourceModel,
        sessionId: input.sessionId,
        validFrom: new Date(),
        contentHash,
        taskScope: input.taskScope ?? null,
        tokenCount,
        // Save embedding vector — null when API unavailable (fallback to text search)
        embedding: embedding || null,
      }).returning();
      memory = inserted[0];
    } catch (dbErr) {
      logger.error({ err: dbErr, vaultId }, 'Postgres insert failed — falling back to offline Redis queue');
      
      // Push to offline queue
      const payload = {
        id: memoryId,
        vaultId,
        type: classifiedType,
        content: input.content,
        tags: input.tags ?? [],
        importance: input.importance ?? 0.5,
        sourceModel: input.sourceModel,
        sessionId: input.sessionId,
        contentHash,
        taskScope: input.taskScope ?? null,
        tokenCount,
      };
      const rClient = redis.getInstance();
      if (rClient) {
        await rClient.rpush(`offline_queue:${vaultId}`, JSON.stringify(payload));
      }
      
      memory = {
        id: memoryId,
        vaultId,
        type: classifiedType,
        tags: input.tags ?? [],
        importance: input.importance ?? 0.5,
        sourceModel: input.sourceModel,
        sessionId: input.sessionId,
        validFrom: new Date(),
        contentHash,
        taskScope: input.taskScope ?? null,
        tokenCount,
      };
    }

    // Compute vault state hash
    const allMemories = await this.getActiveHashes(vaultId);
    const vaultStateHash = computeVaultStateHash(allMemories);

    let attestationId = uuidv4();
    try {
      // Create attestation record
      const [attestation] = await db.insert(attestations).values({
        id: attestationId,
        vaultId,
        operation: 'WRITE',
        memoryIds: [memoryId],
        contentHash,
        vaultStateHash,
      }).returning();
      attestationId = attestation.id;
    } catch (err) {
      logger.error({ err, vaultId }, 'Postgres attestation insert failed — queueing directly to batcher');
    }

    // Queue for Monad (fire-and-forget)
    await attestationBatcher.add({
      id: attestationId,
      vaultId,
      operation: 'WRITE',
      contentHash,
      vaultStateHash,
      createdAt: new Date(),
    });

    // Cache plaintext in Redis for hot reads (5 min TTL) — non-blocking
    setImmediate(() => {
      import('../db/redis.js').then(({ cacheMemory }) => {
        cacheMemory(vaultId, memoryId, input.content).catch(() => {/* Redis optional */});
      }).catch(() => {/* Redis optional */});
    });

    // Fire-and-forget extraction pipeline — populates Neo4j graph
    setImmediate(() => {
      import('./extraction.service.js').then(({ extractionService }) => {
        import('./graph.service.js').then(({ graphService }) => {
          extractionService.extract({
            content: input.content,
            vaultId,
            memoryId: memory.id,
            memoryType: input.type,
          }).then(result => {
            if (result.facts.length > 0 && graphService.isAvailableSync()) {
              return graphService.storeFacts(vaultId, memory.id, result.facts, new Date());
            }
          }).catch(err => logger.warn({ err }, 'Extraction pipeline failed — skipping graph update'));
        }).catch(() => {/* Neo4j optional */});
      }).catch(() => {/* Extraction optional */});
    });

    logger.info({ vaultId, memoryId, type: classifiedType, method: classification.method }, 'Memory written');

    return {
      memory: this.toMemoryType(memory, input.content),
      contentHash,
      attestationId,
      classifiedType,
      hintTypeUsed: classification.method === 'hint',
    };
  }

  // -------------------------------------------------------------------------
  // Recall — delegates to RecallService (two-stage pipeline)
  // -------------------------------------------------------------------------

  async recall(
    vaultId: string,
    input: RecallMemoryInput,
  ): Promise<RecallResult> {
    return recallService.recall(vaultId, input);
  }

  // -------------------------------------------------------------------------
  // Temporal Inspect — "what did the agent know at timestamp T?"
  // -------------------------------------------------------------------------

  async inspect(
    vaultId: string,
    input: MemoryInspectInput,
  ): Promise<RecallResult> {
    const targetTime = new Date(input.timestamp);
    const vaultKey = deriveVaultKey(getEncryptionSecret(), vaultId);

    // Memories valid AT the target timestamp
    const rows = await db.execute(sql`
      SELECT *
      FROM memories
      WHERE vault_id = ${vaultId}
        AND deleted_at IS NULL
        AND valid_from <= ${targetTime.toISOString()}
        AND (valid_until IS NULL OR valid_until > ${targetTime.toISOString()})
      ORDER BY importance DESC, valid_from DESC
      LIMIT 100
    `);

    const decrypted = (rows as Record<string, unknown>[]).map(row => {
      try {
        const plaintext = decrypt(
          { ciphertext: String(row.content), iv: String(row.content_iv), tag: String(row.content_tag) },
          vaultKey
        );
        return this.toMemoryType(row, plaintext);
      } catch (err) {
        return null;
      }
    }).filter(Boolean) as MemoryType[];

    // If query given, filter further by relevance
    let result = decrypted;
    if (input.query) {
      const q = input.query.toLowerCase();
      result = decrypted.filter(m => m.content.toLowerCase().includes(q));
    }

    return { memories: result, totalFound: result.length };
  }

  // -------------------------------------------------------------------------
  // Delete (soft delete + on-chain tombstone)
  // -------------------------------------------------------------------------

  async delete(
    vaultId: string,
    memoryId: string,
  ): Promise<{ contentHash: string; attestationId: string }> {

    const [memory] = await db.select()
      .from(memories)
      .where(and(eq(memories.id, memoryId), eq(memories.vaultId, vaultId)));

    if (!memory) throw new Error('MEMORY_NOT_FOUND');
    if (memory.deletedAt) throw new Error('MEMORY_DELETED');

    // Soft delete
    await db.update(memories)
      .set({ deletedAt: new Date() })
      .where(eq(memories.id, memoryId));

    // Recompute vault state
    const allMemories = await this.getActiveHashes(vaultId);
    const vaultStateHash = computeVaultStateHash(allMemories);

    const [attestation] = await db.insert(attestations).values({
      id: uuidv4(),
      vaultId,
      operation: 'DELETE',
      memoryIds: [memoryId],
      contentHash: memory.contentHash,
      vaultStateHash,
    }).returning();

    await attestationBatcher.add({
      id: attestation.id,
      vaultId,
      operation: 'DELETE',
      contentHash: memory.contentHash,
      vaultStateHash,
      createdAt: attestation.createdAt,
    });

    logger.info({ vaultId, memoryId }, 'Memory deleted');

    return { contentHash: memory.contentHash, attestationId: attestation.id };
  }

  // -------------------------------------------------------------------------
  // Export vault memories (open format)
  // -------------------------------------------------------------------------

  async export(
    vaultId: string,
  ): Promise<{ memories: MemoryType[]; vaultStateHash: string; exportedAt: string }> {

    const vaultKey = deriveVaultKey(getEncryptionSecret(), vaultId);

    const rows = await db.select()
      .from(memories)
      .where(and(eq(memories.vaultId, vaultId), isNull(memories.deletedAt)));

    const decrypted = rows.map(row => {
      try {
        const plaintext = decrypt(
          { ciphertext: row.content, iv: row.contentIv, tag: row.contentTag },
          vaultKey
        );
        return this.toMemoryType(row, plaintext);
      } catch {
        return null;
      }
    }).filter(Boolean) as MemoryType[];

    const vaultStateHash = computeVaultStateHash(rows.map(r => ({ contentHash: r.contentHash })));
    const exportedAt = now();

    // Create export attestation
    const [attestation] = await db.insert(attestations).values({
      id: uuidv4(),
      vaultId,
      operation: 'EXPORT',
      contentHash: vaultStateHash,
      vaultStateHash,
    }).returning();

    await attestationBatcher.add({
      id: attestation.id,
      vaultId,
      operation: 'EXPORT',
      contentHash: vaultStateHash,
      vaultStateHash,
      createdAt: attestation.createdAt,
    });

    return { memories: decrypted, vaultStateHash, exportedAt };
  }

  // -------------------------------------------------------------------------
  // List with pagination
  // -------------------------------------------------------------------------

  async list(vaultId: string, page: number, limit: number) {
    const vaultKey = deriveVaultKey(getEncryptionSecret(), vaultId);
    const offset = (page - 1) * limit;

    const rows = await db.select()
      .from(memories)
      .where(and(eq(memories.vaultId, vaultId), isNull(memories.deletedAt)))
      .limit(limit)
      .offset(offset)
      .orderBy(memories.createdAt);

    const [{ count }] = (await db.execute(sql`
      SELECT COUNT(*)::int as count FROM memories WHERE vault_id = ${vaultId} AND deleted_at IS NULL
    `)) as { count: number }[];

    const decrypted = rows.map(row => {
      try {
        const plaintext = decrypt(
          { ciphertext: row.content, iv: row.contentIv, tag: row.contentTag },
          vaultKey
        );
        return this.toMemoryType(row, plaintext);
      } catch {
        return null;
      }
    }).filter(Boolean) as MemoryType[];

    return {
      items: decrypted,
      total: count,
      page,
      limit,
      hasMore: offset + limit < count,
    };
  }

  // -------------------------------------------------------------------------
  // Reinforcement (Phase 4)
  // -------------------------------------------------------------------------

  async reinforceMemories(vaultId: string, memoryIds: string[]): Promise<void> {
    if (memoryIds.length === 0) return;

    try {
      // Bumps retrieval count, sets last retrieved time, increases importance slightly (max 1.0),
      // and decreases decay rate slightly (min 0.01) so it lasts longer.
      await db.execute(sql`
        UPDATE memories
        SET retrieval_count = retrieval_count + 1,
            last_retrieved_at = NOW(),
            importance = LEAST(1.0, importance + 0.05),
            decay_rate = GREATEST(0.01, decay_rate * 0.95)
        WHERE vault_id = ${vaultId}
          AND id = ANY(${memoryIds})
      `);
    } catch (err) {
      logger.warn({ err, vaultId }, 'Failed to reinforce memories');
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async getActiveHashes(vaultId: string) {
    const rows = await db.select({ contentHash: memories.contentHash })
      .from(memories)
      .where(and(eq(memories.vaultId, vaultId), isNull(memories.deletedAt)));
    return rows;
  }

  private toMemoryType(row: any, plaintext: string): MemoryType {
    const parseDate = (d: any, required: boolean = false): any => {
      if (!d) {
        if (required) throw new Error('Missing required date field');
        return undefined;
      }
      if (typeof d === 'string') return new Date(d).toISOString();
      if (d instanceof Date) return d.toISOString();
      if (required) throw new Error('Invalid date format');
      return undefined;
    };

    return {
      id: row.id,
      vaultId: row.vault_id ?? row.vaultId,
      type: row.type,
      content: plaintext,
      tags: row.tags ?? [],
      importance: row.importance ?? 0.5,
      sourceModel: row.source_model ?? row.sourceModel,
      sessionId: row.session_id ?? row.sessionId,
      validFrom: parseDate(row.valid_from ?? row.validFrom, true),
      validUntil: parseDate(row.valid_until ?? row.validUntil),
      createdAt: parseDate(row.created_at ?? row.createdAt, true),
      deletedAt: parseDate(row.deleted_at ?? row.deletedAt),
      contentHash: row.content_hash ?? row.contentHash,
      provenancePackId: row.provenance_pack_id ?? row.provenancePackId,
      taskScope: row.task_scope ?? row.taskScope ?? undefined,
      tokenCount: row.token_count ?? row.tokenCount ?? 0,
    };
  }
}

export const memoryService = new MemoryService();
