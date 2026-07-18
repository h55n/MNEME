import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sha256, computeVaultStateHash, encrypt, decrypt, deriveVaultKey, buildDID, parseDID } from '@mneme/shared';

// ── Shared utility tests ──────────────────────────────────────────────────────

describe('shared/utils', () => {
  describe('sha256', () => {
    it('produces consistent hashes', () => {
      expect(sha256('hello')).toBe(sha256('hello'));
      expect(sha256('hello')).not.toBe(sha256('world'));
    });

    it('returns a 64-char hex string', () => {
      const hash = sha256('test');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('encrypt/decrypt', () => {
    it('round-trips plaintext correctly', () => {
      const key = deriveVaultKey('0xdeadbeef', 'vault-uuid-123');
      const plaintext = 'Client prefers concise responses.';
      const payload = encrypt(plaintext, key);
      const decrypted = decrypt(payload, key);
      expect(decrypted).toBe(plaintext);
    });

    it('produces different ciphertext for same plaintext (random IV)', () => {
      const key = deriveVaultKey('0xdeadbeef', 'vault-uuid-123');
      const plaintext = 'same content';
      const enc1 = encrypt(plaintext, key);
      const enc2 = encrypt(plaintext, key);
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
      expect(enc1.iv).not.toBe(enc2.iv);
    });

    it('fails to decrypt with wrong key', () => {
      const key1 = deriveVaultKey('0xaaa', 'vault-1');
      const key2 = deriveVaultKey('0xbbb', 'vault-2');
      const payload = encrypt('secret', key1);
      expect(() => decrypt(payload, key2)).toThrow();
    });
  });

  describe('computeVaultStateHash', () => {
    it('produces deterministic hash regardless of order', () => {
      const mems = [
        { contentHash: 'aaaa' },
        { contentHash: 'bbbb' },
        { contentHash: 'cccc' },
      ];
      const shuffled = [
        { contentHash: 'cccc' },
        { contentHash: 'aaaa' },
        { contentHash: 'bbbb' },
      ];
      expect(computeVaultStateHash(mems)).toBe(computeVaultStateHash(shuffled));
    });

    it('changes when content changes', () => {
      const v1 = computeVaultStateHash([{ contentHash: 'aaaa' }]);
      const v2 = computeVaultStateHash([{ contentHash: 'bbbb' }]);
      expect(v1).not.toBe(v2);
    });
  });

  describe('DID helpers', () => {
    it('builds and parses DIDs correctly', () => {
      const did = buildDID('mainnet', '0x742d35Cc');
      expect(did).toBe('did:monad:mainnet:0x742d35Cc');

      const parsed = parseDID(did);
      expect(parsed).toEqual({ method: 'monad', network: 'mainnet', address: '0x742d35Cc' });
    });

    it('returns null for invalid DIDs', () => {
      expect(parseDID('not-a-did')).toBeNull();
      expect(parseDID('did:eth:mainnet:0x123')).toBeNull();
    });
  });
});

// ── API response helpers ──────────────────────────────────────────────────────

describe('shared/api-responses', () => {
  it('successResponse wraps data correctly', async () => {
    const { successResponse } = await import('@mneme/shared');
    const response = successResponse({ foo: 'bar' }, 'req-123');
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ foo: 'bar' });
    expect(response.error).toBeNull();
    expect(response.meta.requestId).toBe('req-123');
  });

  it('errorResponse wraps error correctly', async () => {
    const { errorResponse } = await import('@mneme/shared');
    const response = errorResponse({ code: 'NOT_FOUND', message: 'Not found' });
    expect(response.success).toBe(false);
    expect(response.data).toBeNull();
    expect(response.error?.code).toBe('NOT_FOUND');
  });
});
