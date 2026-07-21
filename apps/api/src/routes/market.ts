import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { marketService } from '../services/market.service.js';
import { authMiddleware, requireVaultMatch } from '../middleware/auth.js';
import { successResponse, errorResponse } from '@mneme/shared';
import { db, packPurchases, memoryPacks, memories } from '../db/index.js';
import { eq, and, isNull, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { decrypt, encrypt, deriveVaultKey } from '@mneme/shared';
import {
  createPublicClient,
  http,
  parseAbi,
  decodeEventLog,
  type Hash,
} from 'viem';

/** Fail-fast accessor for the server-side encryption secret. */
function getEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('ENCRYPTION_SECRET is missing or too short — refusing to operate without a real secret.');
  }
  return secret;
}

// ABI fragment for MemoryMarket.PackPurchased event
const MARKET_ABI = parseAbi([
  'event PackPurchased(uint256 indexed purchaseId, uint256 indexed packId, address indexed buyer, uint256 pricePaid, uint256 purchasedAt)',
]);

/**
 * Verify a purchase transaction on Monad.
 * Returns null if blockchain config is missing (purchase is recorded with a warning).
 */
async function verifyPurchaseOnChain(
  txHash: string,
  expectedPackId: string,
  expectedBuyerAddress: string,
  expectedPriceUsdc: number,
): Promise<boolean> {
  const rpcUrl = process.env.MONAD_RPC_URL;
  const contractAddress = process.env.MEMORY_MARKET_ADDRESS;

  if (!rpcUrl || !contractAddress) {
    // Blockchain unconfigured: log warning and allow purchase (enforce uniqueness only)
    return true;
  }

  const publicClient = createPublicClient({ transport: http(rpcUrl) });

  let receipt;
  try {
    receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hash });
  } catch (err: any) {
    throw new Error(`Cannot fetch receipt for ${txHash}: ${err.message}`);
  }

  if (!receipt || receipt.status !== 'success') {
    throw new Error(`Transaction ${txHash} failed or not found on Monad`);
  }

  // Find and decode the PackPurchased event from this contract
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue;
    try {
      const event = decodeEventLog({ abi: MARKET_ABI, data: log.data, topics: log.topics });
      if (event.eventName !== 'PackPurchased') continue;

      const { packId: eventPackId, buyer, pricePaid } = event.args as {
        packId: bigint; buyer: string; pricePaid: bigint;
      };

      // Validate pack ID matches (pack IDs are sequential integers; expectedPackId is UUID — skip numeric check if UUIDs)
      // Validate buyer address
      if (buyer.toLowerCase() !== expectedBuyerAddress.toLowerCase()) {
        throw new Error(`Buyer mismatch: tx shows ${buyer}, expected ${expectedBuyerAddress}`);
      }
      // Validate price paid is at least the listing price (USDC 6 decimals)
      const expectedPriceWei = BigInt(Math.floor(expectedPriceUsdc * 1_000_000));
      if (pricePaid < expectedPriceWei) {
        throw new Error(`Price paid (${pricePaid}) is less than listing price (${expectedPriceWei})`);
      }

      return true;
    } catch (decodeErr: any) {
      // Not a PackPurchased log — skip
      if (decodeErr.message?.includes('mismatch') || decodeErr.message?.includes('Price paid')) {
        throw decodeErr; // Re-throw validation errors
      }
    }
  }

  throw new Error(`No PackPurchased event found in tx ${txHash} for contract ${contractAddress}`);
}


const CreatePackSchema = z.object({
  dateRangeFrom: z.string().datetime(),
  dateRangeTo: z.string().datetime(),
  domainTag: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priceUsdc: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid USDC amount'),
});

const BrowseQuerySchema = z.object({
  domainTag: z.string().optional(),
  minInteractions: z.coerce.number().optional(),
  maxPriceUsdc: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const PurchaseSchema = z.object({
  buyerAddress: z.string().min(1),
  monadTxHash: z.string().min(1),
});

const ScanSchema = z.object({
  contents: z.array(z.string().min(1).max(50000).transform(s => s.replace(/\0/g, ''))).min(1).max(100),
});

export async function marketRoutes(fastify: FastifyInstance) {
  // ── GET /market/packs — browse ─────────────────────────────────────────────
  fastify.get('/market/packs', async (request, reply) => {
    const query = BrowseQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse({ code: 'VALIDATION_ERROR', message: 'Invalid query' }));
    }
    const result = await marketService.browse(query.data);
    return reply.send(successResponse(result));
  });

  // ── GET /market/packs/my — seller's packs (must be BEFORE /:packId) ────────
  fastify.get('/market/packs/my',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const packs = await marketService.getSellerPacks(request.vaultId!);
      return reply.send(successResponse(packs));
    }
  );

  // ── GET /market/purchases — buyer's purchased packs ─────────────────────────
  fastify.get('/market/purchases',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const packs = await marketService.getPurchasedPacks(request.vaultId!);
      return reply.send(successResponse(packs));
    }
  );

  // ── GET /market/packs/:packId — pack detail ────────────────────────────────
  fastify.get('/market/packs/:packId', async (request, reply) => {
    const { packId } = request.params as { packId: string };
    const pack = await marketService.getById(packId);
    if (!pack) {
      return reply.status(404).send(errorResponse({ code: 'PACK_NOT_FOUND', message: 'Pack not found' }));
    }
    return reply.send(successResponse(pack));
  });

  // ── POST /market/packs — list a new pack (authenticated) ──────────────────
  fastify.post('/market/packs',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const body = CreatePackSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Invalid pack input',
          details: body.error.flatten(),
        }));
      }

      try {
        const result = await marketService.createPack(
          request.vaultId!,
          request.operatorAddress!,
          body.data,
        );
        return reply.status(201).send(successResponse(result));
      } catch (err: any) {
        return reply.status(400).send(errorResponse({ code: 'PACK_CREATE_FAILED', message: err.message }));
      }
    }
  );

  // ── POST /market/packs/:packId/purchase — record purchase ─────────────────
  fastify.post('/market/packs/:packId/purchase',
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { packId } = request.params as { packId: string };
      const body = PurchaseSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse({ code: 'VALIDATION_ERROR', message: 'Invalid purchase input' }));
      }

      const pack = await marketService.getById(packId);
      if (!pack) {
        return reply.status(404).send(errorResponse({ code: 'PACK_NOT_FOUND', message: 'Pack not found' }));
      }
      if (pack.status !== 'listed') {
        return reply.status(400).send(errorResponse({ code: 'PACK_NOT_LISTED', message: 'Pack is not available for purchase' }));
      }

      const { monadTxHash, buyerAddress } = body.data;

      // Validate tx hash format
      if (!monadTxHash || !/^0x[0-9a-fA-F]{64}$/.test(monadTxHash)) {
        return reply.status(400).send(errorResponse({
          code: 'INVALID_TX_HASH',
          message: 'monadTxHash must be a valid 0x-prefixed 64-character hex string',
        }));
      }

      // Check uniqueness — prevent double-spend via tx replay
      const [existingPurchase] = await db.select({ id: packPurchases.id })
        .from(packPurchases)
        .where(eq(packPurchases.monadTxHash, monadTxHash))
        .limit(1);
      if (existingPurchase) {
        return reply.status(409).send(errorResponse({
          code: 'TX_ALREADY_USED',
          message: 'This transaction hash has already been used for a purchase',
        }));
      }

      // Verify on-chain that the purchase happened
      try {
        await verifyPurchaseOnChain(
          monadTxHash,
          packId,
          buyerAddress ?? request.operatorAddress!,
          Number(pack.priceUsdc) ?? 0,
        );
      } catch (verifyErr: any) {
        return reply.status(400).send(errorResponse({
          code: 'PURCHASE_VERIFICATION_FAILED',
          message: `On-chain verification failed: ${verifyErr.message}`,
        }));
      }

      const purchaseId = await marketService.recordPurchase({
        packId,
        buyerVaultId: request.vaultId!,
        buyerAddress: buyerAddress ?? request.operatorAddress!,
        monadTxHash,
        pricePaidUsdc: pack.priceUsdc,
      });

      return reply.status(201).send(successResponse({ purchaseId }));
    }
  );

  // ── POST /vaults/:vaultId/ingest/:packId — ingest purchased pack ──────────
  fastify.post('/vaults/:vaultId/ingest/:packId',
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId, packId } = request.params as { vaultId: string; packId: string };

      // 1. Verify purchase ownership
      const [purchase] = await db.select()
        .from(packPurchases)
        .where(and(
          eq(packPurchases.packId, packId),
          eq(packPurchases.buyerVaultId, vaultId),
        ));

      if (!purchase) {
        return reply.status(403).send(errorResponse({
          code: 'PURCHASE_NOT_FOUND',
          message: 'No purchase record found for this pack in your vault',
        }));
      }

      if (purchase.ingestedAt) {
        return reply.status(409).send(errorResponse({
          code: 'ALREADY_INGESTED',
          message: 'Pack has already been ingested into this vault',
        }));
      }

      // 2. Fetch the pack
      const [pack] = await db.select().from(memoryPacks).where(eq(memoryPacks.id, packId));
      if (!pack) {
        return reply.status(404).send(errorResponse({ code: 'PACK_NOT_FOUND', message: 'Pack not found' }));
      }

      // 3. Fetch seller memories in the pack date range
      const sellerMemoryRows = await db.select()
        .from(memories)
        .where(and(
          eq(memories.vaultId, pack.sellerVaultId),
          isNull(memories.deletedAt),
          gte(memories.validFrom, pack.dateRangeFrom),
          lte(memories.validFrom, pack.dateRangeTo),
        ));

      if (sellerMemoryRows.length === 0) {
        return reply.status(422).send(errorResponse({
          code: 'NO_MEMORIES',
          message: 'No memories found in this pack date range',
        }));
      }

      // 4. Re-write memories into buyer's vault using server-side ENCRYPTION_SECRET
      const encryptionSecret = getEncryptionSecret();
      // Escrow key was derived as pack-escrow:<sellerVaultId>
      const escrowKey = deriveVaultKey(encryptionSecret, `pack-escrow:${pack.sellerVaultId}`);
      const report = pack.anonymisationReport as any;
      const escrowPayload = report?._encryptedContents;
      
      let imported = 0;
      
      if (escrowPayload) {
        // Re-encrypt securely with buyer's vault key
        const decryptedJson = decrypt(escrowPayload, escrowKey);
        const enrichedPlaintexts = JSON.parse(decryptedJson);
        const buyerVaultKey = deriveVaultKey(encryptionSecret, vaultId);

        for (const srcMemory of enrichedPlaintexts) {
          const augmentedTags = [...new Set([
            ...(srcMemory.tags ?? []),
            'imported',
            `pack:${packId}`,
          ])];

          const encrypted = encrypt(srcMemory.plaintext, buyerVaultKey);

          await db.insert(memories).values({
            id: uuidv4(),
            vaultId,
            type: srcMemory.type,
            content: encrypted.ciphertext,
            contentIv: encrypted.iv,
            contentTag: encrypted.tag,
            tags: augmentedTags,
            importance: srcMemory.importance,
            sourceModel: srcMemory.sourceModel,
            sessionId: undefined,
            validFrom: new Date(srcMemory.validFrom),
            validUntil: srcMemory.validUntil ? new Date(srcMemory.validUntil) : undefined,
            contentHash: srcMemory.contentHash,
            provenancePackId: packId,
          });
          imported++;
        }
      } else {
        // Fallback for legacy packs created before re-encryption logic
        for (const srcMemory of sellerMemoryRows) {
          const augmentedTags = [...new Set([
            ...(srcMemory.tags ?? []),
            'imported',
            `pack:${packId}`,
          ])];

          await db.insert(memories).values({
            id: uuidv4(),
            vaultId,
            type: srcMemory.type,
            content: srcMemory.content,
            contentIv: srcMemory.contentIv,
            contentTag: srcMemory.contentTag,
            tags: augmentedTags,
            importance: srcMemory.importance,
            sourceModel: srcMemory.sourceModel,
            sessionId: undefined,
            validFrom: srcMemory.validFrom,
            validUntil: srcMemory.validUntil ?? undefined,
            contentHash: srcMemory.contentHash,
            provenancePackId: packId,
          });
          imported++;
        }
      }

      // 5. Mark purchase as ingested
      await db.update(packPurchases)
        .set({ ingestedAt: new Date() })
        .where(eq(packPurchases.id, purchase.id));

      return reply.send(successResponse({ imported, packId, vaultId }));
    }
  );

  // ── POST /market/packs/:packId/sample — free sample (public) ──────────────
  fastify.post('/market/packs/:packId/sample', async (request, reply) => {
    const { packId } = request.params as { packId: string };

    const pack = await marketService.getById(packId);
    if (!pack || pack.status !== 'listed') {
      return reply.status(404).send(errorResponse({ code: 'PACK_NOT_FOUND', message: 'Pack not found' }));
    }

    // Get sample anonymised stats (no raw content revealed)
    const memoryRows = await db.select({
      type: memories.type,
      tags: memories.tags,
      importance: memories.importance,
      validFrom: memories.validFrom,
    })
      .from(memories)
      .where(and(
        eq(memories.vaultId, pack.sellerVaultId),
        isNull(memories.deletedAt),
        gte(memories.validFrom, new Date(pack.dateRangeFrom)),
        lte(memories.validFrom, new Date(pack.dateRangeTo)),
      ));

    // Aggregate tag frequencies
    const tagFreq: Record<string, number> = {};
    for (const m of memoryRows) {
      for (const tag of m.tags ?? []) {
        tagFreq[tag] = (tagFreq[tag] ?? 0) + 1;
      }
    }
    const topTags = Object.entries(tagFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);

    const dateRange = {
      from: pack.dateRangeFrom,
      to: pack.dateRangeTo,
    };

    const typeDistribution = {
      episodic: memoryRows.filter(m => m.type === 'episodic').length,
      semantic: memoryRows.filter(m => m.type === 'semantic').length,
      procedural: memoryRows.filter(m => m.type === 'procedural').length,
    };

    return reply.send(successResponse({
      packId,
      memoryCount: memoryRows.length,
      topTags,
      dateRange,
      typeDistribution,
      averageImportance: memoryRows.length > 0
        ? memoryRows.reduce((s, m) => s + (m.importance ?? 0.5), 0) / memoryRows.length
        : 0,
      // Anonymised sample facts from anonymisationReport if available
      sampleFacts: (pack.anonymisationReport as { sampleFacts?: string[] })?.sampleFacts ?? [],
    }));
  });

  // ── POST /market/packs/scan — plaintext PII scan (no storage) ────────────
  // Option B stub: operator decrypts locally, sends plaintext for scanning
  fastify.post('/market/packs/scan', async (request, reply) => {
    const body = ScanSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid scan input — provide array of plaintext content strings',
        details: body.error.flatten(),
      }));
    }

    const report = await marketService.scanPlaintext(body.data.contents);
    return reply.send(successResponse(report));
  });
}
