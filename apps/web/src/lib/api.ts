import { demoRequest } from './demoApi';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ── Request ────────────────────────────────────────────────────────────────────

function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    // The API key is stored in-memory only (not in localStorage for security).
    // Read it from the Zustand store state directly.
    const { useAuthStore } = require('@/store');
    return useAuthStore.getState().apiKey ?? '';
  } catch {
    return '';
  }
}

function getVaultId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const session = JSON.parse(localStorage.getItem('mneme-session') ?? '{}');
    return session?.state?.vaultId ?? '';
  } catch {
    return '';
  }
}

function isDemo(): boolean {
  try {
    const { useAuthStore } = require('@/store');
    return useAuthStore.getState().demo === true;
  } catch {
    return false;
  }
}

/** A failed API call. `status` is 0 when the server could not be reached at all. */
export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly kind: 'network' | 'unauthorized' | 'not-found' | 'invalid-response' | 'server') {
    super(message);
    this.name = 'ApiError';
  }
}

/** Where requests go: an explicit base, else the URL saved at login, else the one built into this deployment. */
export function getApiBase(): string {
  try {
    const { useAuthStore } = require('@/store');
    const saved: string | null = useAuthStore.getState().apiUrl;
    if (saved) return saved;
  } catch {
    // store unavailable (server render): use the built-in URL
  }
  return API_BASE.replace(/\/+$/, '');
}

interface RequestOptions {
  /** Use this API URL and key instead of the saved session (login checks them before saving). */
  baseUrl?: string;
  apiKey?: string;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  // The built-in demo answers from fixtures, but only after "Try demo" and never for the
  // login check, which always talks to a real server.
  if (!options.baseUrl && isDemo()) return demoRequest<T>(method, path, body);

  const base = (options.baseUrl ?? getApiBase()).replace(/\/+$/, '');
  if (!base) {
    throw new ApiError('No MNEME API URL is set. Enter the address of your MNEME server.', 0, 'network');
  }
  const apiKey = options.apiKey ?? getApiKey();

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch only rejects when nothing answered: wrong URL, server down, or CORS.
    throw new ApiError(`Can't reach the MNEME API at ${base}. Check the address and that the server is running.`, 0, 'network');
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    // An HTML error page or an empty body: this isn't a MNEME API.
    throw new ApiError(
      res.status === 404
        ? `Nothing at ${base}${path} (404). Is this the address of a MNEME API?`
        : `The server at ${base} did not answer like a MNEME API (HTTP ${res.status}).`,
      res.status,
      res.status === 404 ? 'not-found' : 'invalid-response',
    );
  }

  if (!res.ok || data?.success === false) {
    const message = data?.error?.message ?? data?.message ?? `HTTP ${res.status}`;
    if (res.status === 401 || res.status === 403) throw new ApiError(message, res.status, 'unauthorized');
    if (res.status === 404) throw new ApiError(message, res.status, 'not-found');
    throw new ApiError(message, res.status, 'server');
  }

  return (data?.data ?? data) as T;
}

// ── Vault API ──────────────────────────────────────────────────────────────────

export const vaultApi = {
  create: (body: { operatorAddress: string; name?: string; plan?: string }) =>
    request<{ vault: any; apiKey: string }>('POST', '/vaults', body),

  get: (vaultId: string, options?: RequestOptions) =>
    request<any>('GET', `/vaults/${vaultId}`, undefined, options),

  destroy: (vaultId: string) =>
    request<any>('DELETE', `/vaults/${vaultId}`),

  export: (vaultId: string) =>
    request<any>('GET', `/vaults/${vaultId}/export`),

  rotateKey: (vaultId: string) =>
    request<{ apiKey: string }>('POST', `/vaults/${vaultId}/keys/rotate`),
};

// ── Memory API ─────────────────────────────────────────────────────────────────

export const memoryApi = {
  write: (vaultId: string, body: { content: string; type: string; tags?: string[]; importance?: number }) =>
    request<any>('POST', `/vaults/${vaultId}/memories`, body),

  list: (vaultId: string, page = 1, limit = 20) =>
    request<any>('GET', `/vaults/${vaultId}/memories?page=${page}&limit=${limit}`),

  recall: (vaultId: string, body: { query: string; limit?: number; types?: string[] }) =>
    request<any>('POST', `/vaults/${vaultId}/memories/recall`, body),

  inspect: (vaultId: string, body: { timestamp: string; query?: string }) =>
    request<any>('POST', `/vaults/${vaultId}/memories/inspect`, body),

  delete: (vaultId: string, memoryId: string) =>
    request<any>('DELETE', `/vaults/${vaultId}/memories/${memoryId}`),

  graph: (vaultId: string) =>
    request<any>('GET', `/vaults/${vaultId}/graph`),
};



// ── Market API ─────────────────────────────────────────────────────────────────

export const marketApi = {
  listPacks: () =>
    request<any>('GET', '/market/packs'),

  getPurchasedPacks: () =>
    request<any>('GET', '/market/purchases'),

  getSellerPacks: () =>
    request<any>('GET', '/market/packs/my'),

  createPack: (body: {
    domainTag: string;
    title: string;
    description?: string;
    priceUsdc: string;
    dateRangeFrom: string;
    dateRangeTo: string;
  }) =>
    request<any>('POST', '/market/packs', body),

  purchasePack: (packId: string, body: { monadTxHash: string; buyerAddress?: string }) =>
    request<any>('POST', `/market/packs/${packId}/purchase`, body),

  scanPack: (contents: string[], processingConsent: boolean) =>
    request<any>('POST', '/market/packs/scan', { contents, processingConsent }),

  ingestPack: (vaultId: string, packId: string) =>
    request<any>('POST', `/vaults/${vaultId}/ingest/${packId}`),
};

// ── Compliance API ─────────────────────────────────────────────────────────────

export const complianceApi = {
  generateReport: (vaultId: string, body?: { dateFrom?: string; dateTo?: string; reportType?: string }) =>
    request<any>('POST', `/vaults/${vaultId}/compliance/report`, body ?? {}),

  eraseGdpr: (vaultId: string, body: { memoryIds?: string[]; userIdentifier?: string }) =>
    request<any>('POST', `/vaults/${vaultId}/gdpr/erase`, body),

  auditLog: (vaultId: string, page = 1, limit = 50) =>
    request<any>('GET', `/vaults/${vaultId}/audit/log?page=${page}&limit=${limit}`),
};

export { getVaultId, getApiKey };
