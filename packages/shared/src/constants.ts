// ============================================================
// MNEME Shared Constants
// ============================================================

export const MNEME_VERSION = '1.0.0';

export const API_VERSION = 'v1';

export const MEMORY_TYPES = ['working', 'episodic', 'semantic', 'procedural', 'relational'] as const;

export const TASK_TYPES = ['fact_lookup', 'episodic_recall', 'procedural_lookup', 'general'] as const;

export const OPERATION_TYPES = ['WRITE', 'UPDATE', 'DELETE', 'EXPORT'] as const;

export const PACK_STATUSES = ['pending', 'listed', 'delisted'] as const;

export const VAULT_PLANS = ['free', 'pro', 'enterprise'] as const;

// Memory limits per plan
export const PLAN_LIMITS = {
  free: {
    memoriesPerMonth: 1_000,
    maxVaultMemories: 10_000,
    apiRequestsPerMinute: 60,
  },
  pro: {
    memoriesPerMonth: 100_000,
    maxVaultMemories: 1_000_000,
    apiRequestsPerMinute: 1_000,
  },
  enterprise: {
    memoriesPerMonth: -1, // unlimited
    maxVaultMemories: 10_000_000,
    apiRequestsPerMinute: 10_000,
  },
} as const;

// Attestation batching
export const ATTESTATION_BATCH_SIZE = 100;
export const ATTESTATION_FLUSH_INTERVAL_MS = 10_000;

// Revenue split
export const MARKET_SELLER_SHARE = 0.8; // 80% to seller
export const MARKET_PLATFORM_SHARE = 0.2; // 20% platform fee

// DID method
export const DID_METHOD = 'monad';
export const DID_NETWORK_MAINNET = 'mainnet';
export const DID_NETWORK_TESTNET = 'testnet';
export const DID_NETWORK_DEVNET = 'devnet';

// Encryption
export const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
export const HASH_ALGORITHM = 'sha256';

// Embedding dimensions
export const EMBEDDING_DIMENSIONS = 1536; // text-embedding-3-small

// ── Two-stage retrieval ───────────────────────────────────────────────────────

// Composite scoring weights per task type
export const CLASSIFIER_WEIGHTS = {
  fact_lookup:       { sem: 0.6, rec: 0.1, imp: 0.2, type: 0.1 },
  episodic_recall:   { sem: 0.3, rec: 0.5, imp: 0.1, type: 0.1 },
  procedural_lookup: { sem: 0.5, rec: 0.1, imp: 0.3, type: 0.1 },
  general:           { sem: 0.4, rec: 0.3, imp: 0.2, type: 0.1 },
} as const;

// Distractor filter defaults (overridable per vault)
export const DISTRACTOR_DEFAULTS = {
  simThreshold: 0.65,
  fitThreshold: 0.40,
  neutralFit: 0.6,   // fit score when memory has no task_scope
} as const;

// Token budget
export const DEFAULT_BUDGET_TOKENS = 4000;
export const TOKEN_COUNT_ESTIMATE_RATIO = 4; // chars per token (rough approximation)

// Temporal graph
export const GRAPH_CONFIDENCE_THRESHOLD = 0.7;

// Error codes
export const ERROR_CODES = {
  VAULT_NOT_FOUND: 'VAULT_NOT_FOUND',
  VAULT_DESTROYED: 'VAULT_DESTROYED',
  MEMORY_NOT_FOUND: 'MEMORY_NOT_FOUND',
  MEMORY_DELETED: 'MEMORY_DELETED',
  PACK_NOT_FOUND: 'PACK_NOT_FOUND',
  PACK_PII_DETECTED: 'PACK_PII_DETECTED',
  PACK_NOT_PURCHASED: 'PACK_NOT_PURCHASED',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MONAD_UNAVAILABLE: 'MONAD_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  PLAN_LIMIT_EXCEEDED: 'PLAN_LIMIT_EXCEEDED',
} as const;

// MCP Tool names
export const MCP_TOOLS = {
  MEMORY_WRITE: 'memory_write',
  MEMORY_RECALL: 'memory_recall',
  MEMORY_FORGET: 'memory_forget',
  MEMORY_INSPECT: 'memory_inspect',
  MEMORY_EXPORT: 'memory_export',
  MEMORY_IMPORT: 'memory_import',
} as const;

// Domain tags for Memory Market
export const DOMAIN_TAGS = [
  'legal',
  'finance',
  'healthcare',
  'engineering',
  'sales',
  'customer-support',
  'research',
  'coding',
  'marketing',
  'operations',
  'general',
] as const;

export type DomainTag = typeof DOMAIN_TAGS[number];
