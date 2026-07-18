import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, attestations } from '../db/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { authMiddleware, requireVaultMatch } from '../middleware/auth.js';
import { successResponse, errorResponse } from '@mneme/shared';

const MONAD_EXPLORER_BASE = process.env.MONAD_EXPLORER_URL ?? 'https://explorer.monad.xyz';

const BatchVerifySchema = z.object({
  contentHashes: z.array(z.string().min(1)).min(1).max(100),
});

export async function attestationRoutes(fastify: FastifyInstance) {

  // ── GET /vaults/:vaultId/attestations — list attestations (paginated) ─────
  fastify.get('/vaults/:vaultId/attestations',
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId } = request.params as { vaultId: string };
      const query = request.query as { page?: string; limit?: string };

      const page = Math.max(1, parseInt(query.page ?? '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
      const offset = (page - 1) * limit;

      const rows = await db.select()
        .from(attestations)
        .where(eq(attestations.vaultId, vaultId))
        .limit(limit)
        .offset(offset)
        .orderBy(attestations.createdAt);

      const items = rows.map(a => ({
        id: a.id,
        operation: a.operation,
        memoryIds: a.memoryIds,
        contentHash: a.contentHash,
        vaultStateHash: a.vaultStateHash,
        monadTxHash: a.monadTxHash,
        monadBlock: a.monadBlock,
        batchId: a.batchId,
        createdAt: a.createdAt?.toISOString(),
        confirmedAt: a.confirmedAt?.toISOString(),
        explorerUrl: a.monadTxHash
          ? `${MONAD_EXPLORER_BASE}/tx/${a.monadTxHash}`
          : null,
      }));

      return reply.send(successResponse({
        items,
        page,
        limit,
        hasMore: rows.length === limit,
      }));
    }
  );

  // ── GET /attestations/:txHash — verify specific attestation by Monad tx hash
  fastify.get('/attestations/:txHash', async (request, reply) => {
    const { txHash } = request.params as { txHash: string };

    const [attestation] = await db.select()
      .from(attestations)
      .where(eq(attestations.monadTxHash, txHash));

    if (!attestation) {
      return reply.status(404).send(errorResponse({
        code: 'ATTESTATION_NOT_FOUND',
        message: `No attestation found for tx hash: ${txHash}`,
      }));
    }

    return reply.send(successResponse({
      id: attestation.id,
      vaultId: attestation.vaultId,
      operation: attestation.operation,
      contentHash: attestation.contentHash,
      vaultStateHash: attestation.vaultStateHash,
      monadTxHash: attestation.monadTxHash,
      monadBlock: attestation.monadBlock,
      createdAt: attestation.createdAt?.toISOString(),
      confirmedAt: attestation.confirmedAt?.toISOString(),
      explorerUrl: `${MONAD_EXPLORER_BASE}/tx/${txHash}`,
      verified: !!attestation.confirmedAt,
    }));
  });

  // ── POST /vaults/:vaultId/attestations/verify — batch verify content hashes
  fastify.post('/vaults/:vaultId/attestations/verify',
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId } = request.params as { vaultId: string };
      const body = BatchVerifySchema.safeParse(request.body);

      if (!body.success) {
        return reply.status(400).send(errorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Provide an array of contentHashes (max 100)',
          details: body.error.flatten(),
        }));
      }

      const { contentHashes } = body.data;

      // Look up all provided hashes in one query
      const rows = await db.select()
        .from(attestations)
        .where(and(
          eq(attestations.vaultId, vaultId),
          inArray(attestations.contentHash, contentHashes),
        ));

      // Build result map
      const resultMap = new Map(rows.map(a => [a.contentHash, a]));

      const results = contentHashes.map(hash => {
        const att = resultMap.get(hash);
        return {
          contentHash: hash,
          attested: !!att,
          monadTxHash: att?.monadTxHash ?? null,
          monadBlock: att?.monadBlock ?? null,
          confirmedAt: att?.confirmedAt?.toISOString() ?? null,
          explorerUrl: att?.monadTxHash
            ? `${MONAD_EXPLORER_BASE}/tx/${att.monadTxHash}`
            : null,
        };
      });

      const attestedCount = results.filter(r => r.attested).length;

      return reply.send(successResponse({
        results,
        summary: {
          total: contentHashes.length,
          attested: attestedCount,
          pending: contentHashes.length - attestedCount,
        },
      }));
    }
  );
}
