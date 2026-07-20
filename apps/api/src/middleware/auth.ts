import type { FastifyRequest, FastifyReply } from 'fastify';
import { vaultService } from '../services/vault.service.js';
import { errorResponse } from '@mneme/shared';

declare module 'fastify' {
  interface FastifyRequest {
    vaultId?: string;
    operatorAddress?: string;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    reply.status(401).send(errorResponse({
      code: 'UNAUTHORIZED',
      message: 'Authorization header required',
    }));
    return;
  }

  // Support: "Bearer mneme_xxx..." or "ApiKey mneme_xxx..."
  const [scheme, key] = authHeader.split(' ');
  if (!key || (scheme !== 'Bearer' && scheme !== 'ApiKey')) {
    reply.status(401).send(errorResponse({
      code: 'UNAUTHORIZED',
      message: 'Invalid authorization format. Use: Bearer <api_key>',
    }));
    return;
  }

  const session = await vaultService.validateApiKey(key);
  if (!session) {
    reply.status(401).send(errorResponse({
      code: 'UNAUTHORIZED',
      message: 'Invalid or revoked API key',
    }));
    return;
  }

  request.vaultId = session.vaultId;
  request.operatorAddress = session.operatorAddress;
  // NOTE: Encryption key is derived server-side from ENCRYPTION_SECRET env var.
  // Clients do NOT provide any key material; the x-operator-public-key header is rejected.
}

export function requireVaultMatch(paramName = 'vaultId') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as Record<string, string>;
    const requestedVaultId = params[paramName];

    if (request.vaultId !== requestedVaultId) {
      reply.status(403).send(errorResponse({
        code: 'UNAUTHORIZED',
        message: 'Access denied to this vault',
      }));
      return;
    }
  };
}
