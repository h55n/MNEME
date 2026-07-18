import { db, memoryPacks, packPurchases, memories } from '../db/index.js';
import { eq, and, isNull, gte, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { sha256, decrypt, encrypt, deriveVaultKey } from '@mneme/shared';
import { createHash } from 'crypto';
import type { CreatePackInput, AnonymisationReport, MemoryPack as MemoryPackType } from '@mneme/shared';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('market-service');

// ── PII Patterns ──────────────────────────────────────────────────────────────

interface PiiMatch {
  pattern: string;
  count: number;
}

const PII_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'email',       regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
  { name: 'phone_us',   regex: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { name: 'ssn',        regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { name: 'credit_card',regex: /\b(?:\d[ -]*?){13,16}\b/g },
  { name: 'ipv4',       regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g },
  { name: 'passport',   regex: /\b[A-Z]{1,2}\d{6,9}\b/g },
  { name: 'full_name',  regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g },
];

// ── MarketService ─────────────────────────────────────────────────────────────

export class MarketService {

  // ── Create Pack (PII scan + anonymise) ────────────────────────────────────

  /**
   * Create a memory pack listing after running a real PII scan on decrypted content.
   * @param operatorPublicKey Used to derive the vault key for decryption.
   */
  async createPack(
    vaultId: string,
    sellerAddress: string,
    input: CreatePackInput,
    operatorPublicKey: string,
  ): Promise<{ packId: string; anonymisationReport: AnonymisationReport; piiDetected: boolean }> {

    // Fetch memories in date range
    const memoryRows = await db.select()
      .from(memories)
      .where(and(
        eq(memories.vaultId, vaultId),
        isNull(memories.deletedAt),
        gte(memories.validFrom, new Date(input.dateRangeFrom)),
        lte(memories.validFrom, new Date(input.dateRangeTo)),
      ));

    if (memoryRows.length === 0) {
      throw new Error('No memories found in specified date range');
    }

    // Decrypt memory content for PII scanning (Option A)
    const vaultKey = deriveVaultKey(operatorPublicKey, vaultId);
    const plaintexts: string[] = [];
    for (const row of memoryRows) {
      try {
        const plaintext = decrypt(
          { ciphertext: row.content, iv: row.contentIv, tag: row.contentTag },
          vaultKey,
        );
        plaintexts.push(plaintext);
      } catch (err) {
        logger.warn({ err, memoryId: row.id }, 'Decryption failed during PII scan — skipping memory');
      }
    }

    // Run real PII scan on decrypted plaintext
    const { passed, piiItemsRemoved, report } = this.runPiiScan(plaintexts);

    // Build content hash for the pack
    const packContentHash = sha256(
      memoryRows.map(m => m.contentHash).sort().join('')
    );

    // Prepare escrow encrypted contents
    if (passed) {
      const enrichedPlaintexts = memoryRows.map((row, i) => ({
        plaintext: plaintexts[i],
        type: row.type,
        importance: row.importance,
        tags: row.tags,
        sourceModel: row.sourceModel,
        validFrom: row.validFrom,
        validUntil: row.validUntil,
        contentHash: row.contentHash,
      }));
      
      const serverKey = createHash('sha256').update(process.env.JWT_SECRET || 'mneme-fallback-secret-key-12345').digest();
      const encryptedPayload = encrypt(JSON.stringify(enrichedPlaintexts), serverKey);
      
      // Inject into report securely
      (report as any)._encryptedContents = encryptedPayload;
    }

    const [pack] = await db.insert(memoryPacks).values({
      id: uuidv4(),
      sellerVaultId: vaultId,
      sellerAddress,
      domainTag: input.domainTag,
      title: input.title,
      description: input.description,
      interactionCount: memoryRows.length,
      dateRangeFrom: new Date(input.dateRangeFrom),
      dateRangeTo: new Date(input.dateRangeTo),
      priceUsdc: input.priceUsdc,
      contentHash: packContentHash,
      piiScanPassed: passed,
      anonymisationReport: report,
      status: passed ? 'listed' : 'pending',
      listedAt: passed ? new Date() : null,
    }).returning();

    logger.info({ packId: pack.id, piiPassed: passed, interactionCount: memoryRows.length }, 'Pack created');

    return {
      packId: pack.id,
      anonymisationReport: report,
      piiDetected: !passed,
    };
  }

  // ── Browse packs ──────────────────────────────────────────────────────────

  async browse(filters: {
    domainTag?: string;
    minInteractions?: number;
    maxPriceUsdc?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: MemoryPackType[]; total: number }> {

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const rows = await db.select()
      .from(memoryPacks)
      .where(eq(memoryPacks.status, 'listed'))
      .limit(limit)
      .offset(offset)
      .orderBy(memoryPacks.listedAt);

    const [{ count }] = (await db.execute(sql`
      SELECT COUNT(*)::int as count FROM memory_packs WHERE status = 'listed'
    `)) as { count: number }[];

    return {
      items: rows.map(this.toPackType),
      total: count,
    };
  }

  async getById(packId: string): Promise<MemoryPackType | null> {
    const [pack] = await db.select().from(memoryPacks).where(eq(memoryPacks.id, packId));
    return pack ? this.toPackType(pack) : null;
  }

  // ── Purchase ──────────────────────────────────────────────────────────────

  async recordPurchase(input: {
    packId: string;
    buyerVaultId: string;
    buyerAddress: string;
    monadTxHash: string;
    pricePaidUsdc: string;
  }): Promise<string> {

    const [purchase] = await db.insert(packPurchases).values({
      id: uuidv4(),
      packId: input.packId,
      buyerVaultId: input.buyerVaultId,
      buyerAddress: input.buyerAddress,
      pricePaidUsdc: input.pricePaidUsdc,
      monadTxHash: input.monadTxHash,
    }).returning();

    // Increment purchase count
    await db.execute(sql`
      UPDATE memory_packs SET purchase_count = purchase_count + 1 WHERE id = ${input.packId}
    `);

    return purchase.id;
  }

  async getSellerPacks(sellerVaultId: string): Promise<MemoryPackType[]> {
    const rows = await db.select()
      .from(memoryPacks)
      .where(eq(memoryPacks.sellerVaultId, sellerVaultId));
    return rows.map(this.toPackType);
  }

  // ── Public plaintext scan (Option B endpoint) ─────────────────────────────

  /**
   * Scan operator-provided plaintext content for PII.
   * Content is never stored — this is a stateless scan endpoint.
   */
  async scanPlaintext(contents: string[]): Promise<{
    passed: boolean;
    piiItemsRemoved: number;
    report: AnonymisationReport;
  }> {
    return this.runPiiScan(contents);
  }

  // ── PII Scan (private — real implementation) ──────────────────────────────

  /**
   * Runs regex-based PII detection on an array of plaintext content strings.
   * Returns passed=false if ANY PII is detected.
   */
  private runPiiScan(plaintexts: string[]): {
    passed: boolean;
    piiItemsRemoved: number;
    report: AnonymisationReport;
  } {
    let totalPiiItems = 0;
    const patternHits: PiiMatch[] = [];

    for (const content of plaintexts) {
      for (const { name, regex } of PII_PATTERNS) {
        // Reset lastIndex for global regexes
        regex.lastIndex = 0;
        const matches = content.match(regex) ?? [];
        if (matches.length > 0) {
          totalPiiItems += matches.length;
          const existing = patternHits.find(h => h.pattern === name);
          if (existing) {
            existing.count += matches.length;
          } else {
            patternHits.push({ pattern: name, count: matches.length });
          }
        }
      }
    }

    const passed = totalPiiItems === 0;

    const report: AnonymisationReport = {
      entitiesAnonymised: 0,
      piiItemsRemoved: totalPiiItems,
      differentialPrivacyApplied: false,
      scanTimestamp: new Date().toISOString(),
      passed,
    };

    if (!passed) {
      logger.warn({
        piiItemsFound: totalPiiItems,
        patternHits,
        memoriesScanned: plaintexts.length,
      }, 'PII detected in pack — marking as pending review');
    }

    return { passed, piiItemsRemoved: totalPiiItems, report };
  }

  private toPackType(row: any): MemoryPackType {
    return {
      id: row.id,
      sellerVaultId: row.sellerVaultId ?? row.seller_vault_id,
      sellerAddress: row.sellerAddress ?? row.seller_address,
      domainTag: row.domainTag ?? row.domain_tag,
      title: row.title,
      description: row.description,
      interactionCount: row.interactionCount ?? row.interaction_count,
      dateRangeFrom: (row.dateRangeFrom ?? row.date_range_from)?.toISOString(),
      dateRangeTo: (row.dateRangeTo ?? row.date_range_to)?.toISOString(),
      priceUsdc: row.priceUsdc?.toString() ?? row.price_usdc?.toString(),
      contentHash: row.contentHash ?? row.content_hash,
      monadTxHash: row.monadTxHash ?? row.monad_tx_hash,
      piiScanPassed: row.piiScanPassed ?? row.pii_scan_passed,
      anonymisationReport: (() => {
        if (!row.anonymisationReport) return undefined;
        const reportObj = row.anonymisationReport ?? row.anonymisation_report;
        if (!reportObj) return undefined;
        // Strip _encryptedContents so it doesn't leak to API
        const { _encryptedContents, ...rest } = reportObj as any;
        return rest;
      })(),
      status: row.status,
      listedAt: (row.listedAt ?? row.listed_at)?.toISOString(),
      purchaseCount: row.purchaseCount ?? row.purchase_count ?? 0,
      createdAt: (row.createdAt ?? row.created_at)?.toISOString(),
    };
  }
}

export const marketService = new MarketService();
