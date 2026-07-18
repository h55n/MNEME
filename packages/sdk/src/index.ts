/**
 * MNEME SDK — Official TypeScript client
 *
 * @example
 * ```typescript
 * import { MnemeClient } from '@mneme/sdk';
 *
 * const mneme = new MnemeClient({
 *   apiKey: 'mneme_...',
 *   vaultId: 'uuid-...',
 *   baseUrl: 'https://api.mneme.dev/v1',
 * });
 *
 * // Write a memory
 * await mneme.memories.write({
 *   content: 'Client prefers concise responses under 200 words.',
 *   type: 'semantic',
 *   tags: ['client-pref', 'communication'],
 *   importance: 0.8,
 * });
 *
 * // Recall relevant memories
 * const { memories } = await mneme.memories.recall({ query: 'client preferences' });
 * ```
 */

import type {
  Vault,
  Memory,
  Attestation,
  MemoryPack,
  WriteMemoryInput,
  RecallMemoryInput,
  MemoryInspectInput,
  RecallResult,
  CreatePackInput,
  ComplianceReportInput,
  GdprEraseInput,
  GdprErasureProof,
  PaginatedResponse,
  APIResponse,
} from '@mneme/shared';

export interface MnemeClientConfig {
  /** API key from your vault dashboard */
  apiKey: string;
  /** Vault UUID */
  vaultId: string;
  /** Operator's public key / address for encryption */
  operatorPublicKey?: string;
  /** Base URL (default: https://api.mneme.dev/v1) */
  baseUrl?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}

export class MnemeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'MnemeError';
  }
}

// ── HTTP Client ───────────────────────────────────────────────────────────────

class HttpClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeout: number;

  constructor(config: MnemeClientConfig) {
    this.baseUrl = config.baseUrl ?? 'https://api.mneme.dev/v1';
    this.timeout = config.timeout ?? 30_000;
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      ...(config.operatorPublicKey
        ? { 'X-Operator-Public-Key': config.operatorPublicKey }
        : {}),
    };
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data = (await res.json()) as APIResponse<T>;

      if (!data.success || !res.ok) {
        throw new MnemeError(
          data.error?.message ?? 'Request failed',
          data.error?.code ?? 'UNKNOWN_ERROR',
          res.status,
        );
      }

      return data.data as T;
    } catch (err) {
      if (err instanceof MnemeError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new MnemeError('Request timed out', 'TIMEOUT');
      }
      throw new MnemeError(String(err), 'NETWORK_ERROR');
    } finally {
      clearTimeout(timer);
    }
  }

  get = <T>(path: string) => this.request<T>('GET', path);
  post = <T>(path: string, body?: unknown) => this.request<T>('POST', path, body);
  del = <T>(path: string) => this.request<T>('DELETE', path);
}

// ── Resource Classes ──────────────────────────────────────────────────────────

export class VaultsResource {
  constructor(private readonly http: HttpClient, private readonly vaultId: string) {}

  /** Get vault metadata */
  get(): Promise<Vault> {
    return this.http.get<Vault>(`/vaults/${this.vaultId}`);
  }

  /** Export full vault in open format */
  export(): Promise<{ memories: Memory[]; vaultStateHash: string; exportedAt: string }> {
    return this.http.get(`/vaults/${this.vaultId}/export`);
  }

  /** Rotate API key */
  rotateApiKey(): Promise<{ apiKey: string }> {
    return this.http.post(`/vaults/${this.vaultId}/keys/rotate`);
  }

  /** Destroy vault (creates on-chain tombstone) */
  destroy(): Promise<{ destroyed: boolean }> {
    return this.http.del(`/vaults/${this.vaultId}`);
  }
}

export class MemoriesResource {
  constructor(private readonly http: HttpClient, private readonly vaultId: string) {}

  /**
   * Write a memory to the vault.
   * Automatically generates an on-chain attestation on Monad.
   */
  write(input: WriteMemoryInput): Promise<{ memory: Memory; contentHash: string; attestationId: string }> {
    return this.http.post(`/vaults/${this.vaultId}/memories`, input);
  }

  /**
   * List all memories (paginated).
   */
  list(page = 1, limit = 20): Promise<PaginatedResponse<Memory>> {
    return this.http.get(`/vaults/${this.vaultId}/memories?page=${page}&limit=${limit}`);
  }

  /**
   * Semantic + temporal recall.
   * Returns the most relevant memories for a given query.
   */
  recall(input: RecallMemoryInput): Promise<RecallResult> {
    return this.http.post(`/vaults/${this.vaultId}/memories/recall`, input);
  }

  /**
   * Temporal inspect — query vault state at a historical timestamp.
   * Answers: "what did this agent know on date X?"
   */
  inspect(input: MemoryInspectInput): Promise<RecallResult> {
    return this.http.post(`/vaults/${this.vaultId}/memories/inspect`, input);
  }

  /**
   * Delete a memory with on-chain proof of deletion.
   */
  delete(memoryId: string): Promise<{ contentHash: string; attestationId: string }> {
    return this.http.del(`/vaults/${this.vaultId}/memories/${memoryId}`);
  }
}

export class AttestationsResource {
  constructor(private readonly http: HttpClient, private readonly vaultId: string) {}

  /** List all on-chain attestations for the vault */
  list(page = 1, limit = 50): Promise<Attestation[]> {
    return this.http.get(`/vaults/${this.vaultId}/audit/log?page=${page}&limit=${limit}`);
  }
}

export class MarketResource {
  constructor(private readonly http: HttpClient) {}

  /** Browse memory packs marketplace */
  browse(params?: {
    domainTag?: string;
    minInteractions?: number;
    maxPriceUsdc?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: MemoryPack[]; total: number }> {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.http.get(`/market/packs${qs}`);
  }

  /** Get a specific memory pack */
  get(packId: string): Promise<MemoryPack> {
    return this.http.get(`/market/packs/${packId}`);
  }

  /**
   * List a memory pack for sale.
   * Triggers PII scan and anonymisation pipeline.
   */
  list(input: CreatePackInput): Promise<{ packId: string; anonymisationReport: any; piiDetected: boolean }> {
    return this.http.post('/market/packs', input);
  }

  /** Purchase a pack (handles USDC settlement off-chain, records on Monad) */
  purchase(packId: string, data: { buyerAddress: string; monadTxHash: string }): Promise<{ purchaseId: string }> {
    return this.http.post(`/market/packs/${packId}/purchase`, data);
  }

  /** Ingest a purchased pack into the target vault */
  ingest(vaultId: string, packId: string): Promise<{ imported: number }> {
    return this.http.post(`/vaults/${vaultId}/ingest/${packId}`);
  }

  /** Get your listed packs */
  myPacks(): Promise<MemoryPack[]> {
    return this.http.get('/market/packs/my');
  }
}

export class ComplianceResource {
  constructor(private readonly http: HttpClient, private readonly vaultId: string) {}

  /**
   * Generate a compliance report with on-chain attestation links.
   * Suitable for regulatory submissions.
   */
  generateReport(input?: ComplianceReportInput): Promise<{
    reportId: string;
    reportData: object;
    reportHash: string;
  }> {
    return this.http.post(`/vaults/${this.vaultId}/compliance/report`, input ?? {});
  }

  /**
   * GDPR Article 17 — Right to Erasure.
   * Deletes memories and generates an immutable on-chain tombstone proof.
   */
  eraseGdpr(input: GdprEraseInput): Promise<GdprErasureProof> {
    return this.http.post(`/vaults/${this.vaultId}/gdpr/erase`, input);
  }

  /** Query the audit log */
  auditLog(page = 1, limit = 50): Promise<any[]> {
    return this.http.get(`/vaults/${this.vaultId}/audit/log?page=${page}&limit=${limit}`);
  }
}

// ── Main Client ───────────────────────────────────────────────────────────────

export class MnemeClient {
  public readonly vault: VaultsResource;
  public readonly memories: MemoriesResource;
  public readonly attestations: AttestationsResource;
  public readonly market: MarketResource;
  public readonly compliance: ComplianceResource;

  private readonly http: HttpClient;
  private readonly vaultId: string;

  constructor(private readonly config: MnemeClientConfig) {
    this.http = new HttpClient(config);
    this.vaultId = config.vaultId;

    this.vault = new VaultsResource(this.http, this.vaultId);
    this.memories = new MemoriesResource(this.http, this.vaultId);
    this.attestations = new AttestationsResource(this.http, this.vaultId);
    this.market = new MarketResource(this.http);
    this.compliance = new ComplianceResource(this.http, this.vaultId);
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create a new MNEME client (convenience function).
 *
 * @example
 * ```typescript
 * const mneme = createMnemeClient({
 *   apiKey: process.env.MNEME_API_KEY!,
 *   vaultId: process.env.MNEME_VAULT_ID!,
 * });
 * ```
 */
export function createMnemeClient(config: MnemeClientConfig): MnemeClient {
  return new MnemeClient(config);
}

// Re-export shared types
export type {
  Vault,
  Memory,
  Attestation,
  MemoryPack,
  WriteMemoryInput,
  RecallMemoryInput,
  MemoryInspectInput,
  RecallResult,
  CreatePackInput,
  GdprErasureProof,
} from '@mneme/shared';
export { MCP_TOOLS, DOMAIN_TAGS, PLAN_LIMITS } from '@mneme/shared';
