// ============================================================
// MNEME Shared Types
// ============================================================

// --- Enums ---

export type MemoryType = 'working' | 'episodic' | 'semantic' | 'procedural' | 'relational';

export type TaskType = 'fact_lookup' | 'episodic_recall' | 'procedural_lookup' | 'general';

export interface ClassificationResult {
  type: MemoryType;
  confidence: number;
  method: 'hint' | 'rule' | 'model';
}

export type OperationType = 'WRITE' | 'UPDATE' | 'DELETE' | 'EXPORT';

export type VaultPlan = 'free' | 'pro' | 'enterprise';

export type PackStatus = 'pending' | 'listed' | 'delisted';

// --- Core Entities ---

export interface Vault {
  id: string;
  did: string;
  operatorAddress: string;
  name?: string;
  createdAt: string;
  destroyedAt?: string;
  plan: VaultPlan;
  settings: VaultSettings;
}

export interface VaultSettings {
  encryptionVersion?: number;
  maxMemories?: number;
  autoExtract?: boolean;
}

export interface Memory {
  id: string;
  vaultId: string;
  type: MemoryType;
  content: string;
  tags: string[];
  importance: number;
  sourceModel?: string;
  sessionId?: string;
  validFrom: string;
  validUntil?: string;
  createdAt: string;
  deletedAt?: string;
  contentHash: string;
  provenancePackId?: string;
  // Phase 2 additions
  taskScope?: string;
  tokenCount?: number;
}

export interface Attestation {
  id: string;
  vaultId: string;
  operation: OperationType;
  memoryIds?: string[];
  contentHash: string;
  vaultStateHash: string;
  monadTxHash?: string;
  monadBlock?: number;
  batchId?: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface MemoryPack {
  id: string;
  sellerVaultId: string;
  sellerAddress: string;
  domainTag: string;
  title: string;
  description?: string;
  interactionCount: number;
  dateRangeFrom: string;
  dateRangeTo: string;
  priceUsdc: string;
  contentHash: string;
  monadTxHash?: string;
  piiScanPassed: boolean;
  anonymisationReport?: AnonymisationReport;
  status: PackStatus;
  listedAt?: string;
  purchaseCount: number;
  createdAt: string;
}

export interface AnonymisationReport {
  entitiesAnonymised: number;
  piiItemsRemoved: number;
  differentialPrivacyApplied: boolean;
  scanTimestamp: string;
  passed: boolean;
}

export interface PackPurchase {
  id: string;
  packId: string;
  buyerVaultId: string;
  buyerAddress: string;
  pricePaidUsdc: string;
  monadTxHash: string;
  ingestedAt?: string;
  createdAt: string;
}

export interface ComplianceReport {
  id: string;
  vaultId: string;
  requestedBy: string;
  reportType: string;
  dateFrom?: string;
  dateTo?: string;
  reportHash: string;
  storageKey: string;
  signedAt: string;
  expiresAt?: string;
}

// --- API Shapes ---

export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error: APIError | null;
  meta: ResponseMeta;
}

export interface APIError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  version: string;
}

export interface AttestationMeta {
  contentHash: string;
  monadTxHash: string | null;
  monadBlockNumber: number | null;
  attestedAt: string;
}

// --- Memory Operations ---

export interface WriteMemoryInput {
  content: string;
  type: MemoryType;
  tags?: string[];
  importance?: number;
  sessionId?: string;
  sourceModel?: string;
  // Phase 1 additions
  hintType?: MemoryType;
  taskScope?: string;
}

export interface RecallMemoryInput {
  query: string;
  limit?: number;
  types?: MemoryType[];
  before?: string;
  after?: string;
  includeGraph?: boolean;
  // Phase 2 additions
  budgetTokens?: number;
  budgetStrategy?: 'strict' | 'flexible';
  taskScope?: string;
  taskType?: TaskType;
}

export interface MemoryInspectInput {
  timestamp: string;
  query?: string;
}

export interface RecallResult {
  memories: Memory[];
  graphFacts?: GraphFact[];
  totalFound: number;
  // Phase 2 additions
  totalTokensUsed?: number;
  budgetTokens?: number;
  filteredCount?: number;
  stage1Candidates?: number;
  stage2Removed?: number;
  taskScopeDetected?: string;
}

// --- Graph ---

export interface GraphFact {
  subject: string;
  predicate: string;
  object: string;
  validFrom: string;
  validUntil?: string;
  confidence: number;
  sourceMemoryId: string;
}

export interface Entity {
  id: string;
  type: string;
  label: string;
  anonymizedId?: string;
  vaultId: string;
}

// --- Market ---

export interface CreatePackInput {
  dateRangeFrom: string;
  dateRangeTo: string;
  domainTag: string;
  title: string;
  description?: string;
  priceUsdc: string;
}

export interface PackSampleResult {
  sampleFacts: GraphFact[];
  memoryCount: number;
  topTags: string[];
}

// --- Compliance ---

export interface ComplianceReportInput {
  dateFrom?: string;
  dateTo?: string;
  reportType?: string;
}

export interface GdprEraseInput {
  memoryIds?: string[];
  userIdentifier?: string;
}

export interface GdprErasureProof {
  deletedCount: number;
  tombstoneHash: string;
  monadTxHash: string;
  deletionTimestamp: string;
}

// --- DID ---

export interface DIDDocument {
  '@context': string[];
  id: string;
  verificationMethod: VerificationMethod[];
  service: ServiceEndpoint[];
  controller: string;
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyHex: string;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string;
}

// --- Pagination ---

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// --- MCP Tool Definitions ---

export interface MCPToolInput {
  vaultId: string;
  operatorSignature: string;
}

export interface MemoryWriteToolInput extends MCPToolInput {
  content: string;
  type: MemoryType;
  tags?: string[];
  importance?: number;
}

export interface MemoryRecallToolInput extends MCPToolInput {
  query: string;
  limit?: number;
  types?: MemoryType[];
  before?: string;
  after?: string;
  budgetTokens?: number;
  taskScope?: string;
  taskType?: TaskType;
}

export interface MemoryForgetToolInput extends MCPToolInput {
  memoryId: string;
}

export interface MemoryInspectToolInput extends MCPToolInput {
  timestamp: string;
  query?: string;
}

export interface MemoryExportToolInput extends MCPToolInput {
  format?: 'mneme' | 'mem0' | 'zep';
}

export interface MemoryImportToolInput extends MCPToolInput {
  format: 'mem0' | 'zep' | 'letta' | 'mneme';
  data: Record<string, unknown>;
}
