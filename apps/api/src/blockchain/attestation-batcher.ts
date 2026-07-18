import { ethers } from 'ethers';
import { db } from '../db/index.js';
import { attestations } from '../db/schema.js';
import { eq, isNull } from 'drizzle-orm';
import { sha256 } from '@mneme/shared';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('attestation-batcher');

// ABI for AttestationAggregator.batchAttest
const ATTESTATION_ABI = [
  'function batchAttest(bytes32[] vaultIds, bytes32[] contentHashes, bytes32[] stateHashes, uint8[] operationTypes, uint256[] timestamps) returns (uint256)',
  'event BatchAttested(uint256 indexed batchId, uint256 attestationCount, address indexed submitter, uint256 timestamp)',
];

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

export class AttestationBatcher {
  private queue: PendingAttestation[] = [];
  private isProcessing = false;
  private flushTimer?: NodeJS.Timeout;

  private readonly BATCH_SIZE = parseInt(process.env.ATTESTATION_BATCH_SIZE ?? '100');
  private readonly FLUSH_INTERVAL_MS = parseInt(process.env.ATTESTATION_FLUSH_INTERVAL_MS ?? '10000');

  private provider?: ethers.JsonRpcProvider;
  private signer?: ethers.Wallet;
  private contract?: ethers.Contract;

  constructor() {
    this.initBlockchain();
    this.startFlushTimer();
  }

  private initBlockchain() {
    const rpcUrl = process.env.MONAD_RPC_URL;
    const privateKey = process.env.MONAD_PRIVATE_KEY;
    const contractAddress = process.env.ATTESTATION_AGGREGATOR_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
      logger.warn('Monad blockchain config incomplete — attestations will queue but not submit');
      return;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.signer = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(contractAddress, ATTESTATION_ABI, this.signer);
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
      if (!this.contract || !this.signer) {
        logger.warn('No blockchain connection — attestations marked as pending');
        return;
      }

      const vaultIds = batch.map(a => ethers.zeroPadBytes(
        ethers.toUtf8Bytes(a.vaultId).slice(0, 32), 32
      ));
      const contentHashes = batch.map(a => `0x${a.contentHash.padEnd(64, '0').slice(0, 64)}`);
      const stateHashes = batch.map(a => `0x${a.vaultStateHash.padEnd(64, '0').slice(0, 64)}`);
      const opTypes = batch.map(a => OPERATION_TYPES[a.operation] ?? 0);
      const timestamps = batch.map(a => Math.floor(new Date(a.createdAt).getTime() / 1000));

      const tx = await this.contract.batchAttest(
        vaultIds,
        contentHashes,
        stateHashes,
        opTypes,
        timestamps,
        { gasLimit: 5_000_000 }
      );

      const receipt = await tx.wait();
      const txHash = receipt.hash;
      const blockNumber = receipt.blockNumber;

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
      logger.error({ err, batchSize: batch.length }, 'Attestation batch failed — will retry');
      // Re-queue failed items
      this.queue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  async emergencyFlush(): Promise<void> {
    while (this.queue.length > 0) {
      await this.flush();
    }
  }

  destroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
  }
}

// Singleton
export const attestationBatcher = new AttestationBatcher();
