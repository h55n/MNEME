#!/usr/bin/env tsx
/**
 * migrate-vault-keys.ts — Re-encryption migration script.
 *
 * Migrates all stored memory ciphertexts from the old key derivation
 * (sha256(operatorPublicKey + vaultId)) to the new HKDF-based key
 * (HKDF-SHA256(ENCRYPTION_SECRET, vaultId)).
 *
 * Usage:
 *   tsx scripts/migrate-vault-keys.ts --dry-run   # Log what would be migrated, no writes
 *   tsx scripts/migrate-vault-keys.ts              # Actually migrate
 *
 * Pre-requisites:
 *   - OLD_ENCRYPTION_MODE=legacy must be set if you still have legacy-encrypted rows.
 *   - ENCRYPTION_SECRET must be set to the new server secret (≥32 chars).
 *   - DATABASE_URL must be set.
 *
 * WARNING: Run in a transaction. Back up your database before running.
 */

import 'dotenv/config';
import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import postgres from 'postgres';

const DRY_RUN = process.argv.includes('--dry-run');

// ── Old key derivation (kept here only for migration purposes) ──────────────
function oldDeriveVaultKey(operatorPublicKey: string, vaultId: string): Buffer {
  return createHash('sha256')
    .update(operatorPublicKey)
    .update(vaultId)
    .digest();
}

// ── New key derivation (matches updated utils.ts) ──────────────────────────
function newDeriveVaultKey(serverSecret: string, vaultId: string): Buffer {
  const salt = createHash('sha256').update(vaultId).digest();
  const prk  = createHmac('sha256', salt).update(serverSecret).digest();
  const info = Buffer.from('mneme-vault-key');
  return createHmac('sha256', prk).update(info).update(Buffer.from([0x01])).digest();
}

function decryptLegacy(ciphertext: string, iv: string, tag: string, key: Buffer): string {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function encryptNew(plaintext: string, key: Buffer): { ciphertext: string; iv: string; tag: string } {
  const iv     = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    ciphertext: encrypted.toString('hex'),
    iv:         iv.toString('hex'),
    tag:        cipher.getAuthTag().toString('hex'),
  };
}

async function main() {
  const encryptionSecret = process.env.ENCRYPTION_SECRET;
  if (!encryptionSecret || encryptionSecret.length < 32) {
    console.error('❌ ENCRYPTION_SECRET must be set and ≥32 chars');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL must be set');
    process.exit(1);
  }

  console.log(DRY_RUN ? '🔍 DRY RUN — no writes will be made' : '⚠️  LIVE RUN — will re-encrypt all memories');
  console.log('');

  const sql = postgres(process.env.DATABASE_URL);

  // Fetch all non-deleted memories with their vault's operator address
  // NOTE: The old key uses the operatorPublicKey stored in the vaults table
  const rows = await sql`
    SELECT m.id, m.vault_id, m.content, m.content_iv, m.content_tag, v.operator_address
    FROM memories m
    JOIN vaults v ON v.id = m.vault_id
    WHERE m.deleted_at IS NULL
    ORDER BY m.vault_id, m.created_at
  `;

  console.log(`Found ${rows.length} memories to migrate`);
  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const { id, vault_id, content, content_iv, content_tag, operator_address } = row;

    if (!operator_address) {
      console.warn(`  ⚠ Memory ${id}: vault has no operator_address — skipping`);
      skipped++;
      continue;
    }

    try {
      // 1. Decrypt with old key (operator public key based)
      const oldKey = oldDeriveVaultKey(operator_address, vault_id);
      let plaintext: string;
      try {
        plaintext = decryptLegacy(content, content_iv, content_tag, oldKey);
      } catch (decryptErr) {
        // May already be on the new key — test with new key
        const newKey = newDeriveVaultKey(encryptionSecret, vault_id);
        try {
          decryptLegacy(content, content_iv, content_tag, newKey);
          console.log(`  ✓ Memory ${id} already on new key — skipping`);
          skipped++;
          continue;
        } catch {
          console.warn(`  ✗ Memory ${id}: cannot decrypt with either key — skipping`);
          errors++;
          continue;
        }
      }

      // 2. Re-encrypt with new key
      const newKey = newDeriveVaultKey(encryptionSecret, vault_id);
      const { ciphertext, iv, tag } = encryptNew(plaintext, newKey);

      if (DRY_RUN) {
        console.log(`  [DRY] Would migrate memory ${id} (vault ${vault_id.slice(0, 8)}...)`);
      } else {
        await sql`
          UPDATE memories
          SET content = ${ciphertext}, content_iv = ${iv}, content_tag = ${tag}
          WHERE id = ${id}
        `;
        console.log(`  ✓ Migrated memory ${id}`);
      }
      migrated++;
    } catch (err: any) {
      console.error(`  ✗ Error migrating memory ${id}: ${err.message}`);
      errors++;
    }
  }

  console.log('');
  console.log('── Migration Summary ─────────────────────────');
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);
  console.log(DRY_RUN ? '  Mode: DRY RUN (no changes written)' : '  Mode: LIVE (changes written)');
  console.log('──────────────────────────────────────────────');

  await sql.end();
  process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
