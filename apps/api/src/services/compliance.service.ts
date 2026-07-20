import { db, complianceReports, attestations, memories } from '../db/index.js';
import { eq, and, gte, lte, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { sha256 } from '@mneme/shared';
import type { ComplianceReportInput, GdprEraseInput, GdprErasureProof } from '@mneme/shared';
import { attestationBatcher } from '../blockchain/attestation-batcher.js';
import { createLogger } from '../utils/logger.js';
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
  parseAbi,
  keccak256,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const logger = createLogger('compliance-service');

// ABI for DeletionProver.proveDeletion
const DELETION_PROVER_ABI = parseAbi([
  'function proveDeletion(bytes32 vaultId, bytes32[] deletedContentHashes, string gdprBasis, string userIdentifier, bytes operatorSig) returns (uint256)',
  'event DeletionProved(uint256 indexed deletionId, bytes32 indexed vaultId, bytes32 tombstoneHash, address indexed operator, uint256 deletedAt, string gdprBasis)',
]);

/** Convert a UUID string to a stable bytes32 hex string via keccak256. */
function toBytes32VaultId(vaultId: string): Hex {
  if (/^0x[0-9a-fA-F]{64}$/.test(vaultId)) return vaultId as Hex;
  return keccak256(`0x${Buffer.from(vaultId, 'utf8').toString('hex')}`);
}

/** Convert a hex content hash string to a 0x-prefixed bytes32. */
function toBytes32Hash(hash: string): Hex {
  const clean = hash.replace(/^0x/, '').padEnd(64, '0').slice(0, 64);
  return `0x${clean}` as Hex;
}

/**
 * Submit a deletion proof to DeletionProver on Monad.
 * Returns the tx hash, or null if blockchain is not configured.
 */
async function submitDeletionProof(
  vaultId: string,
  contentHashes: string[],
  gdprBasis: string,
  userIdentifier: string,
): Promise<{ txHash: string; deletionId: number } | null> {
  const rpcUrl = process.env.MONAD_RPC_URL;
  const privateKey = process.env.MONAD_PRIVATE_KEY;
  const contractAddress = process.env.DELETION_PROVER_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    logger.warn('DeletionProver: Monad config incomplete — proof will not be submitted on-chain');
    return null;
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const publicClient = createPublicClient({ transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, transport: http(rpcUrl) });

  const vaultIdBytes32 = toBytes32VaultId(vaultId);
  const hashBytes32s = contentHashes.map(h => toBytes32Hash(h));

  // Sign deletion data for the contract
  const messageHash = keccak256(
    `0x${[
      vaultIdBytes32.slice(2),
      ...hashBytes32s.map(h => h.slice(2)),
      Buffer.from(gdprBasis).toString('hex').padEnd(64, '0').slice(0, 64),
      Buffer.from(userIdentifier).toString('hex').padEnd(64, '0').slice(0, 64),
    ].join('')}` as Hex
  );

  const operatorSig = await walletClient.signMessage({
    account,
    message: { raw: messageHash },
  });

  const callData = encodeFunctionData({
    abi: DELETION_PROVER_ABI,
    functionName: 'proveDeletion',
    args: [vaultIdBytes32, hashBytes32s, gdprBasis, userIdentifier, operatorSig],
  });

  const txHash = await walletClient.sendTransaction({
    account,
    to: contractAddress as `0x${string}`,
    data: callData,
    chain: null,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') {
    throw new Error(`DeletionProver tx reverted: ${txHash}`);
  }

  // Parse the deletionId from event logs (first DeletionProved log)
  let deletionId = 0;
  for (const log of receipt.logs) {
    try {
      // DeletionProved(uint256 indexed deletionId, ...)
      deletionId = Number(log.topics[1] ? BigInt(log.topics[1]) : 0n);
      break;
    } catch {
      // ignore non-matching logs
    }
  }

  logger.info({ txHash, deletionId, vaultId }, 'DeletionProver.proveDeletion confirmed');
  return { txHash, deletionId };
}

export class ComplianceService {

  // -------------------------------------------------------------------------
  // Generate Compliance Report (with date filters now applied)
  // -------------------------------------------------------------------------

  async generateReport(
    vaultId: string,
    requestedBy: string,
    input: ComplianceReportInput,
  ): Promise<{ reportId: string; reportData: object; reportHash: string }> {

    // Build date-range conditions
    const dateFrom = input.dateFrom ? new Date(input.dateFrom) : undefined;
    const dateTo   = input.dateTo   ? new Date(input.dateTo)   : undefined;

    const attestationConditions = [eq(attestations.vaultId, vaultId)];
    if (dateFrom) attestationConditions.push(gte(attestations.createdAt, dateFrom));
    if (dateTo)   attestationConditions.push(lte(attestations.createdAt, dateTo));

    const memoryConditions = [eq(memories.vaultId, vaultId), isNull(memories.deletedAt)];
    if (dateFrom) memoryConditions.push(gte(memories.createdAt, dateFrom));
    if (dateTo)   memoryConditions.push(lte(memories.createdAt, dateTo));

    // Gather attestations filtered by date range
    const attestationRows = await db.select()
      .from(attestations)
      .where(and(...attestationConditions));

    // Gather memory stats filtered by date range
    const memoryRows = await db.select()
      .from(memories)
      .where(and(...memoryConditions));

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
        monadExplorerUrl: process.env.MONAD_EXPLORER_URL ?? 'https://explorer.monad.xyz',
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
      dateFrom: dateFrom ?? null,
      dateTo: dateTo ?? null,
      reportHash,
      storageKey,
      signedAt: new Date(),
    }).returning();

    logger.info({ reportId: report.id, vaultId }, 'Compliance report generated');

    return { reportId: report.id, reportData, reportHash };
  }

  // -------------------------------------------------------------------------
  // GDPR Erasure (Right to be Forgotten) — now wired to DeletionProver
  // -------------------------------------------------------------------------

  async eraseGdpr(
    vaultId: string,
    input: GdprEraseInput,
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

    // Soft delete all targets in DB
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

    // Submit on-chain proof to DeletionProver (Article 17 — Right to Erasure)
    const gdprBasis = 'Article 17 - Right to Erasure (GDPR)';
    const userIdentifier = input.userIdentifier ?? `vault:${vaultId.slice(0, 8)}`;

    let monadTxHash = 'pending';
    let monadDeletionId: number | undefined;

    try {
      const onChainResult = await submitDeletionProof(
        vaultId,
        deletedHashes,
        gdprBasis,
        userIdentifier,
      );
      if (onChainResult) {
        monadTxHash = onChainResult.txHash;
        monadDeletionId = onChainResult.deletionId;
      }
    } catch (err) {
      // Log but don't block the erasure — DB deletion has already occurred
      logger.error({ err, vaultId }, 'DeletionProver on-chain submission failed — erasure remains in DB only');
    }

    // Create deletion attestation in DB
    const [attestation] = await db.insert(attestations).values({
      id: uuidv4(),
      vaultId,
      operation: 'DELETE',
      memoryIds: targetMemories.map(m => m.id),
      contentHash: tombstoneHash,
      vaultStateHash: tombstoneHash,
      monadTxHash: monadTxHash !== 'pending' ? monadTxHash : undefined,
      confirmedAt: monadTxHash !== 'pending' ? new Date() : undefined,
    }).returning();

    logger.info({ vaultId, deletedCount: targetMemories.length, monadTxHash, monadDeletionId }, 'GDPR erasure completed');

    return {
      deletedCount: targetMemories.length,
      tombstoneHash,
      monadTxHash,
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

    return {
      items: rows.map(a => ({
        id: a.id,
        operation: a.operation,
        contentHash: a.contentHash,
        monadTxHash: a.monadTxHash,
        monadBlock: a.monadBlock,
        createdAt: a.createdAt?.toISOString(),
        confirmedAt: a.confirmedAt?.toISOString(),
      })),
      total: rows.length,
      page,
      limit,
    };
  }
}

export const complianceService = new ComplianceService();
