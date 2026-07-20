import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { complianceService } from '../services/compliance.service.js';
import { authMiddleware, requireVaultMatch } from '../middleware/auth.js';
import { successResponse, errorResponse } from '@mneme/shared';

const ComplianceReportSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  reportType: z.enum(['audit', 'gdpr', 'decision-log']).optional(),
});

const GdprEraseSchema = z.object({
  memoryIds: z.array(z.string().uuid()).optional(),
  userIdentifier: z.string().optional(),
});

const AuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function complianceRoutes(fastify: FastifyInstance) {
  // POST /vaults/:vaultId/compliance/report
  fastify.post('/vaults/:vaultId/compliance/report',
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId } = request.params as { vaultId: string };
      const body = ComplianceReportSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse({ code: 'VALIDATION_ERROR', message: 'Invalid input' }));
      }

      const result = await complianceService.generateReport(
        vaultId,
        request.operatorAddress!,
        body.data,
      );
      return reply.send(successResponse(result));
    }
  );

  // POST /vaults/:vaultId/gdpr/erase
  fastify.post('/vaults/:vaultId/gdpr/erase',
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId } = request.params as { vaultId: string };
      const body = GdprEraseSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse({ code: 'VALIDATION_ERROR', message: 'Invalid input' }));
      }

      try {
        const proof = await complianceService.eraseGdpr(vaultId, body.data);
        return reply.send(successResponse(proof));
      } catch (err: any) {
        return reply.status(400).send(errorResponse({ code: 'INTERNAL_ERROR', message: err.message }));
      }
    }
  );

  // GET /vaults/:vaultId/audit/log
  fastify.get('/vaults/:vaultId/audit/log',
    { preHandler: [authMiddleware, requireVaultMatch()] },
    async (request, reply) => {
      const { vaultId } = request.params as { vaultId: string };
      const query = AuditLogQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.status(400).send(errorResponse({ code: 'VALIDATION_ERROR', message: 'Invalid query' }));
      }

      const log = await complianceService.getAuditLog(vaultId, query.data.page, query.data.limit);
      return reply.send(successResponse(log));
    }
  );
}
