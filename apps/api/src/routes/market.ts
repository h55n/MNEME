import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { marketService } from '../services/market.service.js';
import { memoryService } from '../services/memory.service.js';
import { authMiddleware, requireVaultMatch } from '../middleware/auth.js';
import { successResponse, errorResponse } from '@mneme/shared';
import { db, packPurchases, memoryPacks, memories } from '../db/index.js';
import { eq, and, isNull, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { decrypt, encrypt, deriveVaultKey } from '@mneme/shared';
import { createHash } from 'crypto';

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
          request.operatorPublicKey!,
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

      const purchaseId = await marketService.recordPurchase({
        packId,
        buyerVaultId: request.vaultId!,
        buyerAddress: body.data.buyerAddress,
        monadTxHash: body.data.monadTxHash,
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

      // 4. Re-write memories into buyer's vault
      // Retrieve the escrow payload securely from the pack metadata
      const serverKey = createHash('sha256').update(process.env.JWT_SECRET || 'mneme-fallback-secret-key-12345').digest();
      const report = pack.anonymisationReport as any;
      const escrowPayload = report?._encryptedContents;
      
      let imported = 0;
      
      if (escrowPayload) {
        // Re-encrypt securely with buyer's vault key
        const decryptedJson = decrypt(escrowPayload, serverKey);
        const enrichedPlaintexts = JSON.parse(decryptedJson);
        const buyerVaultKey = deriveVaultKey(request.operatorPublicKey!, vaultId);

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
