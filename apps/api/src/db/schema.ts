import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  real,
  integer,
  numeric,
  jsonb,
  bigint,
  index,
  customType,
} from 'drizzle-orm/pg-core';

// pgvector custom column type
const vector = customType<{ data: number[]; driverData: string; config: { length?: number } }>({
  dataType(config) {
    return config?.length ? `vector(${config.length})` : 'vector';
  },
  fromDriver(value: string): number[] {
    // Postgres returns vector as '[1,2,3]'
    return JSON.parse(value.replace(/^\[/, '[').replace(/\]$/, ']'));
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
});

// ============================================================
// Vaults
// ============================================================

export const vaults = pgTable('vaults', {
  id: uuid('id').primaryKey().defaultRandom(),
  did: text('did').notNull().unique(),
  operatorAddress: text('operator_address').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  destroyedAt: timestamp('destroyed_at', { withTimezone: true }),
  plan: text('plan').notNull().default('free'), // free | pro | enterprise
  settings: jsonb('settings').notNull().default({}),
  // Distractor filter thresholds (Phase 2)
  distractorSimThreshold: real('distractor_sim_threshold').notNull().default(0.65),
  distractorFitThreshold: real('distractor_fit_threshold').notNull().default(0.40),
}, (t) => ({
  didIdx: index('vaults_did_idx').on(t.did),
  operatorIdx: index('vaults_operator_idx').on(t.operatorAddress),
}));

// ============================================================
// Segments
// ============================================================

export const segments = pgTable('segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  vaultId: uuid('vault_id').notNull().references(() => vaults.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // topic | temporal | task
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  importance: real('importance').notNull().default(0.5),
  memoryCount: integer('memory_count').notNull().default(0),
  lastAccessed: timestamp('last_accessed', { withTimezone: true }),
  sessionId: uuid('session_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  vaultIdx: index('segments_vault_idx').on(t.vaultId),
}));

// ============================================================
// Memories
// ============================================================

export const memories = pgTable('memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  vaultId: uuid('vault_id').notNull().references(() => vaults.id),
  type: text('type').notNull(), // working | episodic | semantic | procedural | relational
  content: text('content').notNull(),        // Encrypted AES-256-GCM (hex)
  contentIv: text('content_iv').notNull(),    // Encryption IV (hex)
  contentTag: text('content_tag').notNull(),  // Auth tag (hex)
  embedding: vector('embedding', { length: 1536 }),  // pgvector 1536-dim
  tags: text('tags').array().notNull().default([]),
  importance: real('importance').notNull().default(0.5),
  sourceModel: text('source_model'),
  sessionId: uuid('session_id'),
  validFrom: timestamp('valid_from', { withTimezone: true }).notNull().defaultNow(),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  contentHash: text('content_hash').notNull(),
  provenancePackId: uuid('provenance_pack_id').references(() => memoryPacks.id),
  taskScope: text('task_scope'),
  tokenCount: integer('token_count').notNull().default(0),
  // Phase 4 additions
  retrievalCount: integer('retrieval_count').notNull().default(0),
  lastRetrievedAt: timestamp('last_retrieved_at', { withTimezone: true }),
  decayRate: real('decay_rate').notNull().default(0.1),
  segmentId: uuid('segment_id').references(() => segments.id, { onDelete: 'set null' }),
}, (t) => ({
  vaultIdx: index('memories_vault_idx').on(t.vaultId),
  vaultTypeIdx: index('memories_vault_type_idx').on(t.vaultId, t.type),
  vaultValidIdx: index('memories_vault_valid_idx').on(t.vaultId, t.validFrom, t.validUntil),
  hashIdx: index('memories_hash_idx').on(t.contentHash),
  taskScopeIdx: index('idx_memories_task_scope').on(t.vaultId, t.taskScope, t.createdAt),
  decayIdx: index('idx_memories_decay').on(t.vaultId, t.lastRetrievedAt, t.importance),
  segmentIdx: index('idx_memories_segment').on(t.segmentId),
}));

// ============================================================
// Attestations
// ============================================================

export const attestations = pgTable('attestations', {
  id: uuid('id').primaryKey().defaultRandom(),
  vaultId: uuid('vault_id').notNull().references(() => vaults.id),
  operation: text('operation').notNull(), // WRITE | UPDATE | DELETE | EXPORT
  memoryIds: uuid('memory_ids').array(),
  contentHash: text('content_hash').notNull(),
  vaultStateHash: text('vault_state_hash').notNull(),
  monadTxHash: text('monad_tx_hash'),
  monadBlock: bigint('monad_block', { mode: 'number' }),
  batchId: uuid('batch_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
}, (t) => ({
  vaultIdx: index('attestations_vault_idx').on(t.vaultId),
  txHashIdx: index('attestations_tx_hash_idx').on(t.monadTxHash),
  createdIdx: index('attestations_created_idx').on(t.vaultId, t.createdAt),
}));

// ============================================================
// Memory Packs (Market)
// ============================================================

export const memoryPacks = pgTable('memory_packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerVaultId: uuid('seller_vault_id').notNull().references(() => vaults.id),
  sellerAddress: text('seller_address').notNull(),
  domainTag: text('domain_tag').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  interactionCount: integer('interaction_count').notNull(),
  dateRangeFrom: timestamp('date_range_from', { withTimezone: true }).notNull(),
  dateRangeTo: timestamp('date_range_to', { withTimezone: true }).notNull(),
  priceUsdc: numeric('price_usdc', { precision: 18, scale: 6 }).notNull(),
  contentHash: text('content_hash').notNull(),
  monadTxHash: text('monad_tx_hash'),
  piiScanPassed: boolean('pii_scan_passed').notNull().default(false),
  anonymisationReport: jsonb('anonymisation_report'),
  status: text('status').notNull().default('pending'), // pending | listed | delisted
  listedAt: timestamp('listed_at', { withTimezone: true }),
  purchaseCount: integer('purchase_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  sellerIdx: index('packs_seller_idx').on(t.sellerVaultId),
  statusIdx: index('packs_status_idx').on(t.status),
  domainIdx: index('packs_domain_idx').on(t.domainTag),
}));

// ============================================================
// Pack Purchases
// ============================================================

export const packPurchases = pgTable('pack_purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  packId: uuid('pack_id').notNull().references(() => memoryPacks.id),
  buyerVaultId: uuid('buyer_vault_id').notNull().references(() => vaults.id),
  buyerAddress: text('buyer_address').notNull(),
  pricePaidUsdc: numeric('price_paid_usdc', { precision: 18, scale: 6 }).notNull(),
  monadTxHash: text('monad_tx_hash').notNull(),
  ingestedAt: timestamp('ingested_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  packIdx: index('purchases_pack_idx').on(t.packId),
  buyerIdx: index('purchases_buyer_idx').on(t.buyerVaultId),
}));

// ============================================================
// Compliance Reports
// ============================================================

export const complianceReports = pgTable('compliance_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  vaultId: uuid('vault_id').notNull().references(() => vaults.id),
  requestedBy: text('requested_by').notNull(),
  reportType: text('report_type').notNull(),
  dateFrom: timestamp('date_from', { withTimezone: true }),
  dateTo: timestamp('date_to', { withTimezone: true }),
  reportHash: text('report_hash').notNull(),
  storageKey: text('storage_key').notNull(),
  signedAt: timestamp('signed_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (t) => ({
  vaultIdx: index('compliance_vault_idx').on(t.vaultId),
}));

// ============================================================
// API Keys
// ============================================================

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  vaultId: uuid('vault_id').notNull().references(() => vaults.id),
  keyHash: text('key_hash').notNull().unique(), // SHA-256 of plaintext key
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (t) => ({
  hashIdx: index('api_keys_hash_idx').on(t.keyHash),
  vaultIdx: index('api_keys_vault_idx').on(t.vaultId),
}));

// Type exports
export type Vault = typeof vaults.$inferSelect;
export type NewVault = typeof vaults.$inferInsert;
export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
export type Attestation = typeof attestations.$inferSelect;
export type NewAttestation = typeof attestations.$inferInsert;
export type MemoryPack = typeof memoryPacks.$inferSelect;
export type NewMemoryPack = typeof memoryPacks.$inferInsert;
export type PackPurchase = typeof packPurchases.$inferSelect;
export type NewPackPurchase = typeof packPurchases.$inferInsert;
export type ComplianceReport = typeof complianceReports.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Segment = typeof segments.$inferSelect;
export type NewSegment = typeof segments.$inferInsert;
