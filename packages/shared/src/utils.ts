import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import type { APIResponse, APIError, ResponseMeta } from './types.js';
import { MNEME_VERSION, API_VERSION } from './constants.js';

// ============================================================
// Hashing
// ============================================================

export function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function computeContentHash(content: string): string {
  return sha256(content);
}

export function computeVaultStateHash(memories: { contentHash: string }[]): string {
  const sorted = [...memories].sort((a, b) => a.contentHash.localeCompare(b.contentHash));
  const combined = sorted.map(m => m.contentHash).join('');
  return sha256(combined);
}

// ============================================================
// Encryption (AES-256-GCM)
// ============================================================

export interface EncryptedPayload {
  ciphertext: string; // hex
  iv: string;         // hex
  tag: string;        // hex (auth tag)
}

export function encrypt(plaintext: string, key: Buffer): EncryptedPayload {
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

export function decrypt(payload: EncryptedPayload, key: Buffer): string {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(payload.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function deriveVaultKey(operatorPublicKey: string, vaultId: string): Buffer {
  // Deterministic key derivation — operator key + vault ID → 256-bit key
  return createHash('sha256')
    .update(operatorPublicKey)
    .update(vaultId)
    .digest();
}

// ============================================================
// API Response Helpers
// ============================================================

export function successResponse<T>(data: T, requestId?: string): APIResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta: buildMeta(requestId),
  };
}

export function errorResponse(error: APIError, requestId?: string): APIResponse<never> {
  return {
    success: false,
    data: null,
    error,
    meta: buildMeta(requestId),
  };
}

function buildMeta(requestId?: string): ResponseMeta {
  return {
    requestId: requestId ?? randomBytes(8).toString('hex'),
    timestamp: new Date().toISOString(),
    version: `${API_VERSION}/${MNEME_VERSION}`,
  };
}

// ============================================================
// DID Helpers
// ============================================================

export function buildDID(network: string, address: string): string {
  return `did:monad:${network}:${address}`;
}

export function parseDID(did: string): { method: string; network: string; address: string } | null {
  const parts = did.split(':');
  if (parts.length !== 4 || parts[0] !== 'did' || parts[1] !== 'monad') return null;
  return { method: parts[1], network: parts[2], address: parts[3] };
}

// ============================================================
// Validation Helpers
// ============================================================

export function isValidEthAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function isValidDID(did: string): boolean {
  return parseDID(did) !== null;
}

// ============================================================
// Formatting
// ============================================================

export function formatUsdc(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(6);
}

export function paginate<T>(items: T[], page: number, limit: number) {
  const offset = (page - 1) * limit;
  const sliced = items.slice(offset, offset + limit);
  return {
    items: sliced,
    total: items.length,
    page,
    limit,
    hasMore: offset + limit < items.length,
  };
}

// ============================================================
// Date Helpers
// ============================================================

export function now(): string {
  return new Date().toISOString();
}

export function isExpired(validUntil: string | undefined): boolean {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date();
}
