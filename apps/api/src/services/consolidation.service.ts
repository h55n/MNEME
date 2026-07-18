import { eq, and, sql } from 'drizzle-orm';
import { db, memories, segments } from '../db/index.js';
import { llmService } from './llm.service.js';
import { deriveVaultKey, decrypt } from '@mneme/shared';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('consolidation-service');

export class ConsolidationService {
  /**
   * Consolidates episodic memories from a given session into a new Temporal Segment.
   * Generates a summary and prunes "dead" memories.
   */
  async consolidateSession(vaultId: string, sessionId: string, operatorPublicKey: string): Promise<void> {
    const vaultKey = deriveVaultKey(operatorPublicKey, vaultId);

    try {
      // 1. Fetch all episodic memories for the session
      const sessionMemories = await db.select()
        .from(memories)
        .where(
          and(
            eq(memories.vaultId, vaultId),
            eq(memories.sessionId, sessionId),
            eq(memories.type, 'episodic')
          )
        );

      if (sessionMemories.length === 0) {
        logger.info({ vaultId, sessionId }, 'No episodic memories to consolidate for session');
        return;
      }

      // 2. Decrypt content to generate a summary
      const plaintexts = sessionMemories.map(m => {
        try {
          return decrypt({ ciphertext: m.content, iv: m.contentIv, tag: m.contentTag }, vaultKey);
        } catch {
          return '';
        }
      }).filter(Boolean);

      const combinedText = plaintexts.join('\n\n').slice(0, 30000); // limit to fit context window

      // 3. Generate summary via LLM
      const summary = await llmService.compressMemory(
        combinedText, 
        'Summarize the key events, facts, and outcomes of this entire session into a single cohesive narrative.',
        200 // target summary tokens
      );

      // 4. Create the Segment
      const [segment] = await db.insert(segments).values({
        vaultId,
        type: 'temporal',
        title: `Session Summary: ${new Date().toISOString().split('T')[0]}`,
        summary,
        importance: 0.8,
        memoryCount: sessionMemories.length,
        sessionId,
      }).returning();

      // 5. Update memories to belong to this segment
      await db.update(memories)
        .set({ segmentId: segment.id })
        .where(
          and(
            eq(memories.vaultId, vaultId),
            eq(memories.sessionId, sessionId)
          )
        );

      // 6. Prune dead memories (importance < 0.05)
      const pruneResult = await db.update(memories)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(memories.vaultId, vaultId),
            sql`importance < 0.05`,
            sql`deleted_at IS NULL`
          )
        );

      logger.info({ vaultId, sessionId, segmentId: segment.id, pruned: pruneResult.count }, 'Session consolidated');
    } catch (err) {
      logger.error({ err, vaultId, sessionId }, 'Session consolidation failed');
    }
  }
}

export const consolidationService = new ConsolidationService();
