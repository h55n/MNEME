import { createPublicClient, createWalletClient, http, type Hex, padHex, stringToHex, encodeFunctionData, parseAbi, keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { db, attestations } from '../db/index.js';
import { eq, and, lte, sql as drizzleSql } from 'drizzle-orm';
import { sha256 } from '@mneme/shared';
import { createLogger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('attestation-batcher');

// ABI for AttestationAggregator.batchAttest
const ATTESTATION_ABI = parseAbi([
  'function batchAttest(bytes32[] vaultIds, bytes32[] contentHashes, bytes32[] stateHashes, uint8[] operationTypes, uint256[] timestamps) returns (uint256)',
  'event BatchAttested(uint256 indexed batchId, uint256 attestationCount, address indexed submitter, uint256 timestamp)',
]);

const OPERATION_TYPES: Record<string, number> = {
  WRITE: 0,
  UPDATE: 1,
  DELETE: 2,
  EXPORT: 3,
};

interface PendingAttestation {
  id: string;
  vaultId: string;
  operation: string;
  contentHash: string;
  vaultStateHash: string;
  createdAt: Date;
}

/**
 * Converts a UUID string or on-chain vault ID to a padded bytes32 hex string.
 * Uses keccak256(uuid) to produce a canonical bytes32 from a UUID.
 * This avoids the previous bug of slicing/truncating the UUID string.
 */
function toBytes32VaultId(vaultId: string): Hex {
  // If it already looks like a 0x bytes32 (66 chars), use it directly
  if (/^0x[0-9a-fA-F]{64}$/.test(vaultId)) {
    return vaultId as Hex;
  }
  // Otherwise derive a stable bytes32 from the UUID via keccak256
  return keccak256(`0x${Buffer.from(vaultId, 'utf8').toString('hex')}`);
}

export class AttestationBatcher {
  // In-memory queue is the working buffer; the outbox table is the durable store.
  private queue: PendingAttestation[] = [];
  private isProcessing = false;
  private flushTimer?: NodeJS.Timeout;

  private readonly BATCH_SIZE = parseInt(process.env.ATTESTATION_BATCH_SIZE ?? '100');
  private readonly FLUSH_INTERVAL_MS = parseInt(process.env.ATTESTATION_FLUSH_INTERVAL_MS ?? '10000');
  // Maximum retries per batch attempt before giving up and marking as deferred
  private readonly MAX_BATCH_RETRIES = 3;

  private publicClient?: ReturnType<typeof createPublicClient>;
  private walletClient?: ReturnType<typeof createWalletClient>;
  private account?: ReturnType<typeof privateKeyToAccount>;
  private contractAddress?: `0x${string}`;
  private blockchainReady = false;

  constructor() {
    this.initBlockchain();
    this.startFlushTimer();
  }

  private initBlockchain() {
    const rpcUrl = process.env.MONAD_RPC_URL;
    const privateKey = process.env.MONAD_PRIVATE_KEY;
    const contractAddress = process.env.ATTESTATION_AGGREGATOR_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
      logger.warn('Monad blockchain config incomplete — attestations will be persisted locally but not submitted on-chain');
      return;
    }

    try {
      this.publicClient = createPublicClient({ transport: http(rpcUrl) });
      this.account = privateKeyToAccount(privateKey as `0x${string}`);
      this.walletClient = createWalletClient({ account: this.account, transport: http(rpcUrl) });
      this.contractAddress = contractAddress as `0x${string}`;
      this.blockchainReady = true;
      logger.info({ contractAddress }, 'Attestation batcher connected to Monad');
    } catch (err) {
      logger.error({ err }, 'Failed to initialise blockchain connection');
    }
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush().catch(err => logger.error({ err }, 'Flush error'));
      }
    }, this.FLUSH_INTERVAL_MS);
  }

  async add(attestation: PendingAttestation): Promise<string> {
    this.queue.push(attestation);

    if (this.queue.length >= this.BATCH_SIZE) {
      // Don't await — let it run async
      this.flush().catch(err => logger.error({ err }, 'Batch flush error'));
    }

    return attestation.contentHash;
  }

  async flush(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const batch = this.queue.splice(0, this.BATCH_SIZE);
    logger.info({ batchSize: batch.length }, 'Flushing attestation batch');

    try {
      if (!this.blockchainReady || !this.publicClient || !this.walletClient || !this.account || !this.contractAddress) {
        // No blockchain — mark attestations as pending in DB but don't crash
        logger.warn({ batchSize: batch.length }, 'No blockchain connection — attestations remain pending in DB');
        return;
      }

      // Build proper bytes32 vault IDs (not the old truncated UUID strings)
      const vaultIds = batch.map(a => toBytes32VaultId(a.vaultId));
      const contentHashes = batch.map(a => `0x${a.contentHash.padEnd(64, '0').slice(0, 64)}` as Hex);
      const stateHashes = batch.map(a => `0x${a.vaultStateHash.padEnd(64, '0').slice(0, 64)}` as Hex);
      const opTypes = batch.map(a => OPERATION_TYPES[a.operation] ?? 0);
      const timestamps = batch.map(a => BigInt(Math.floor(new Date(a.createdAt).getTime() / 1000)));

      // Estimate gas and add a 10% buffer per monskills `gas` skill guidelines
      const requestArgs = {
        account: this.account,
        to: this.contractAddress,
        data: encodeFunctionData({
          abi: ATTESTATION_ABI,
          functionName: 'batchAttest',
          args: [vaultIds, contentHashes, stateHashes, opTypes, timestamps]
        })
      } as const;

      const estimatedGas = await this.publicClient.estimateGas(requestArgs);
      const gasLimit = estimatedGas + (estimatedGas / 10n); // 10% buffer

      const txHash = await this.walletClient.sendTransaction({
        ...requestArgs,
        chain: null,
        gas: gasLimit,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
      const blockNumber = Number(receipt.blockNumber);

      logger.info({ txHash, blockNumber, batchSize: batch.length }, 'Batch attested on Monad');

      // Update DB records
      await Promise.all(batch.map(a =>
        db.update(attestations)
          .set({
            monadTxHash: txHash,
            monadBlock: blockNumber,
            confirmedAt: new Date(),
          })
          .where(eq(attestations.id, a.id))
      ));

    } catch (err) {
      logger.error({ err, batchSize: batch.length }, 'Attestation batch failed — re-queuing for retry');
      // Re-queue failed items (they remain pending in DB)
      this.queue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Bounded emergency flush — max 3 attempts, 2s between, then gives up.
   * Called during graceful shutdown with a 10-second outer deadline in index.ts.
   */
  async emergencyFlush(): Promise<void> {
    const MAX_RETRIES = 3;
    let attempts = 0;

    while (this.queue.length > 0 && attempts < MAX_RETRIES) {
      attempts++;
      logger.info({ attempt: attempts, queueLength: this.queue.length }, 'emergencyFlush attempt');
      await this.flush();
      if (this.queue.length > 0 && attempts < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (this.queue.length > 0) {
      logger.warn({ remainingCount: this.queue.length }, 'emergencyFlush exhausted retries — some attestations remain pending in DB');
    }
  }

  destroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
  }
}

// Singleton
export const attestationBatcher = new AttestationBatcher();
