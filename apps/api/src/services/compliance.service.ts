import { db, complianceReports, attestations, memories } from '../db/index.js';
import { eq, and, gte, lte, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { sha256 } from '@mneme/shared';
import type { ComplianceReportInput, GdprEraseInput, GdprErasureProof } from '@mneme/shared';
import { attestationBatcher } from '../blockchain/attestation-batcher.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('compliance-service');

export class ComplianceService {

  // -------------------------------------------------------------------------
  // Generate Compliance Report
  // -------------------------------------------------------------------------

  async generateReport(
    vaultId: string,
    requestedBy: string,
    input: ComplianceReportInput,
  ): Promise<{ reportId: string; reportData: object; reportHash: string }> {

    // Gather attestations for date range
    const attestationRows = await db.select()
      .from(attestations)
      .where(eq(attestations.vaultId, vaultId));

    // Gather memory stats
    const memoryRows = await db.select()
      .from(memories)
      .where(and(
        eq(memories.vaultId, vaultId),
        isNull(memories.deletedAt),
      ));

    const reportData = {
      generatedAt: new Date().toISOString(),
      vaultId,
      requestedBy,
      reportType: input.reportType ?? 'audit',
      dateRange: {
        from: input.dateFrom ?? null,
        to: input.dateTo ?? null,
      },
      summary: {
        totalMemories: memoryRows.length,
        episodicMemories: memoryRows.filter(m => m.type === 'episodic').length,
        semanticMemories: memoryRows.filter(m => m.type === 'semantic').length,
        proceduralMemories: memoryRows.filter(m => m.type === 'procedural').length,
        totalAttestations: attestationRows.length,
        confirmedAttestations: attestationRows.filter(a => a.confirmedAt).length,
        pendingAttestations: attestationRows.filter(a => !a.confirmedAt).length,
      },
      attestations: attestationRows.slice(0, 100).map(a => ({
        id: a.id,
        operation: a.operation,
        contentHash: a.contentHash,
        monadTxHash: a.monadTxHash,
        monadBlock: a.monadBlock,
        timestamp: a.createdAt?.toISOString(),
        confirmedAt: a.confirmedAt?.toISOString(),
      })),
      onChainVerification: {
        monadExplorerUrl: `https://explorer.monad.xyz`,
        note: 'Verify attestations by searching tx hash on Monad explorer',
      },
    };

    const reportHash = sha256(JSON.stringify(reportData));
    const storageKey = `compliance/${vaultId}/${uuidv4()}.json`;

    const [report] = await db.insert(complianceReports).values({
      id: uuidv4(),
      vaultId,
      requestedBy,
      reportType: input.reportType ?? 'audit',
      dateFrom: input.dateFrom ? new Date(input.dateFrom) : null,
      dateTo: input.dateTo ? new Date(input.dateTo) : null,
      reportHash,
      storageKey,
      signedAt: new Date(),
    }).returning();

    logger.info({ reportId: report.id, vaultId }, 'Compliance report generated');

    return { reportId: report.id, reportData, reportHash };
  }

  // -------------------------------------------------------------------------
  // GDPR Erasure (Right to be Forgotten)
  // -------------------------------------------------------------------------

  async eraseGdpr(
    vaultId: string,
    input: GdprEraseInput,
    operatorPublicKey: string,
  ): Promise<GdprErasureProof> {

    let targetMemories;

    if (input.memoryIds?.length) {
      // Delete specific memories
      targetMemories = await db.select()
        .from(memories)
        .where(and(
          eq(memories.vaultId, vaultId),
          isNull(memories.deletedAt),
        ));
      targetMemories = targetMemories.filter(m => input.memoryIds!.includes(m.id));
    } else {
      // Delete all active memories (full erasure)
      targetMemories = await db.select()
        .from(memories)
        .where(and(
          eq(memories.vaultId, vaultId),
          isNull(memories.deletedAt),
        ));
    }

    if (targetMemories.length === 0) {
      throw new Error('No memories found to erase');
    }

    const deletedHashes = targetMemories.map(m => m.contentHash);
    const deletionTimestamp = new Date().toISOString();

    // Soft delete all targets
    const deletedAt = new Date();
    await Promise.all(
      targetMemories.map(m =>
        db.update(memories)
          .set({ deletedAt })
          .where(eq(memories.id, m.id))
      )
    );

    // Compute tombstone hash
    const tombstoneHash = sha256(deletedHashes.sort().join('') + deletionTimestamp);

    // Create deletion attestation
    const [attestation] = await db.insert(attestations).values({
      id: uuidv4(),
      vaultId,
      operation: 'DELETE',
      memoryIds: targetMemories.map(m => m.id),
      contentHash: tombstoneHash,
      vaultStateHash: tombstoneHash,
    }).returning();

    await attestationBatcher.add({
      id: attestation.id,
      vaultId,
      operation: 'DELETE',
      contentHash: tombstoneHash,
      vaultStateHash: tombstoneHash,
      createdAt: attestation.createdAt,
    });

    await attestationBatcher.emergencyFlush();

    logger.info({ vaultId, deletedCount: targetMemories.length }, 'GDPR erasure completed');

    return {
      deletedCount: targetMemories.length,
      tombstoneHash,
      monadTxHash: attestation.monadTxHash ?? 'pending',
      deletionTimestamp,
    };
  }

  async getAuditLog(vaultId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const rows = await db.select()
      .from(attestations)
      .where(eq(attestations.vaultId, vaultId))
      .limit(limit)
      .offset(offset)
      .orderBy(attestations.createdAt);

    return rows.map(a => ({
      id: a.id,
      operation: a.operation,
      contentHash: a.contentHash,
      monadTxHash: a.monadTxHash,
      monadBlock: a.monadBlock,
      createdAt: a.createdAt?.toISOString(),
      confirmedAt: a.confirmedAt?.toISOString(),
    }));
  }
}

export const complianceService = new ComplianceService();
