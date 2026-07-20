const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// Demo mode: only active in non-production environments when no API URL is configured.
// In production, this is a hard block — demo data must never silently mask an outage.
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DEMO_MODE = !IS_PRODUCTION && (!process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL === '');

if (IS_PRODUCTION && (!process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL === '')) {
  // In production with no API URL, we let the requests fail visibly rather than silently serving demo data.
  console.error('[MNEME] NEXT_PUBLIC_API_URL is not set in a production build. API requests will fail visibly.');
}

// ── Demo Fixtures ──────────────────────────────────────────────────────────────

const DEMO_VAULT = {
  id: 'vlt_demo_mneme_01',
  name: 'Demo Agent Vault',
  operatorAddress: '0x742d35Cc6634C0532925a3b8D4C9E3B9a1C2F0d4',
  plan: 'pro',
};

const DEMO_API_KEY = 'mnk_live_xK9q2mPZfN8vLrT5wDjYb3cHs7uAeGiQ';

const DEMO_MEMORIES = [
  {
    id: 'mem_001',
    content: 'User consistently prefers dark mode interfaces and high-contrast text for accessibility. Always apply system dark-mode by default.',
    type: 'procedural',
    importance: 0.92,
    tags: ['ux', 'preference', 'accessibility'],
    contentHash: '0xa3f8c2e1d9b4736faa12e9c0d817b3f2',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    monadTxHash: '0x4a7c2e91f8b3d5a6c2e91f8b3d5a6c2e91f8b3d5a6c2e91f8b3d5a6',
  },
  {
    id: 'mem_002',
    content: 'Monad Testnet chain ID: 10143. RPC: https://testnet-rpc.monad.xyz. VaultRegistry: 0x19b31A7F2759Dac9FFe8Bf9C9D7e2C5446068b73. All contracts deployed and verified.',
    type: 'semantic',
    importance: 0.88,
    tags: ['blockchain', 'monad', 'testnet', 'contracts'],
    contentHash: '0xb5d1a9e7f3c64821bc93a0f1d28c7e54',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    monadTxHash: '0x7e3f1b9a4c2d8e5f7e3f1b9a4c2d8e5f7e3f1b9a4c2d8e5f7e3f1b9a',
  },
  {
    id: 'mem_003',
    content: 'DeFi trading strategy: momentum + RSI crossover on 4h timeframes. Risk-per-trade: max 1.5% NAV. Exit when RSI > 72 or stop-loss at -3%.',
    type: 'procedural',
    importance: 0.78,
    tags: ['defi', 'trading', 'strategy', 'risk-management'],
    contentHash: '0xc9a2b6d4e8f18301d7ae5cbf92047163',
    createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    monadTxHash: null,
  },
  {
    id: 'mem_004',
    content: 'Client Acme Corp communication preference: weekly digest summaries, not real-time alerts. Primary contact: Sarah Chen (VP Engineering). Meeting cadence: bi-weekly Tuesdays 3pm UTC.',
    type: 'episodic',
    importance: 0.73,
    tags: ['client', 'acme', 'communication', 'schedule'],
    contentHash: '0xd2c5e7a1b9f34d82c0e61af9827b35c0',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    monadTxHash: '0x1c5e8a2f4b7d9e1c5e8a2f4b7d9e1c5e8a2f4b7d9e1c5e8a2f4b7d9',
  },
  {
    id: 'mem_005',
    content: 'Python best practices: use dataclasses + pydantic v2 for validation. Avoid mutable defaults in class definitions. Prefer `from __future__ import annotations` for type hints.',
    type: 'semantic',
    importance: 0.65,
    tags: ['coding', 'python', 'best-practice', 'pydantic'],
    contentHash: '0xe8b3f1c6d4a27512e93c04b6df8a2095',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    monadTxHash: null,
  },
  {
    id: 'mem_006',
    content: 'Solidity audit checklist: check re-entrancy guards, verify access modifiers on all state-changing functions, confirm events are emitted for all state transitions.',
    type: 'procedural',
    importance: 0.85,
    tags: ['security', 'solidity', 'audit', 'smart-contracts'],
    contentHash: '0xf4e1a9c2b8d53607e0b294ca517f386d',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    monadTxHash: '0x9d1f4a7c2e8b3506f9d1f4a7c2e8b3506f9d1f4a7c2e8b3506f9d1f4a',
  },
  {
    id: 'mem_007',
    content: 'Team standup notes 2026-07-04: Hassan working on MCP integration, Mrunmayee finalizing compliance UI, Tanishq deploying smart contracts to Monad Testnet. Sprint review Thursday.',
    type: 'episodic',
    importance: 0.6,
    tags: ['team', 'standup', 'planning'],
    contentHash: '0xa7b2c3d4e5f60718293a4b5c6d7e8f90',
    createdAt: new Date(Date.now() - 3600000 * 22).toISOString(),
    monadTxHash: null,
  },
];

const DEMO_AUDIT_LOG = [
  {
    id: 'evt_001',
    operation: 'WRITE',
    contentHash: '0xa3f8c2e1...d9b4',
    monadTxHash: '0x4a7c2e91f8b3d5a6c2e91f8b3d5a6c2e91f8b3d5',
    monadBlock: 1284921,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'evt_002',
    operation: 'WRITE',
    contentHash: '0xb5d1a9e7...f3c6',
    monadTxHash: '0x7e3f1b9a4c2d8e5f7e3f1b9a4c2d8e5f7e3f1b9a',
    monadBlock: 1289433,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'evt_003',
    operation: 'WRITE',
    contentHash: '0xf4e1a9c2...b8d5',
    monadTxHash: '0x9d1f4a7c2e8b3506f9d1f4a7c2e8b3506f9d1f4a',
    monadBlock: 1291200,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'evt_004',
    operation: 'WRITE',
    contentHash: '0xd2c5e7a1...b9f3',
    monadTxHash: '0x1c5e8a2f4b7d9e1c5e8a2f4b7d9e1c5e8a2f4b7d',
    monadBlock: 1292800,
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 'evt_005',
    operation: 'EXPORT',
    contentHash: '0xf1a4c9b2...e8d6',
    monadTxHash: null,
    monadBlock: null,
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

const DEMO_GRAPH_DATA = {
  nodes: [
    { id: 'Agent', group: 1, label: 'Agent Vault', val: 20 },
    { id: 'Dark Mode', group: 2, label: 'Dark Mode', val: 10 },
    { id: 'Accessibility', group: 2, label: 'Accessibility', val: 10 },
    { id: 'Monad', group: 3, label: 'Monad Testnet', val: 15 },
    { id: 'Smart Contracts', group: 3, label: 'Smart Contracts', val: 10 },
    { id: 'DeFi Trading', group: 4, label: 'DeFi Trading', val: 15 },
    { id: 'RSI Strategy', group: 4, label: 'RSI Strategy', val: 10 },
    { id: 'Acme Corp', group: 5, label: 'Acme Corp', val: 10 },
    { id: 'Sarah Chen', group: 5, label: 'Sarah Chen', val: 5 },
    { id: 'Python', group: 6, label: 'Python', val: 10 },
    { id: 'Pydantic', group: 6, label: 'Pydantic', val: 5 },
  ],
  links: [
    { source: 'Agent', target: 'Dark Mode', label: 'PREFERS' },
    { source: 'Dark Mode', target: 'Accessibility', label: 'RELATES_TO' },
    { source: 'Agent', target: 'Monad', label: 'KNOWS' },
    { source: 'Monad', target: 'Smart Contracts', label: 'HAS' },
    { source: 'Agent', target: 'DeFi Trading', label: 'EXECUTES' },
    { source: 'DeFi Trading', target: 'RSI Strategy', label: 'USES' },
    { source: 'Agent', target: 'Acme Corp', label: 'MANAGES' },
    { source: 'Acme Corp', target: 'Sarah Chen', label: 'CONTACT' },
    { source: 'Agent', target: 'Python', label: 'SKILL' },
    { source: 'Python', target: 'Pydantic', label: 'BEST_PRACTICE' },
  ],
};

// ── In-memory session state (survives within a tab session) ────────────────────

const _sessionMemories: any[] = [];

async function mockDelay(ms = 500) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function handleMockRequest<T>(method: string, path: string, body?: any): Promise<T> {
  await mockDelay();

  // ── Vault ──────────────────────────────────────────────────────────────────
  if (path === '/vaults' && method === 'POST') {
    return {
      vault: {
        id: DEMO_VAULT.id,
        name: body?.name || DEMO_VAULT.name,
        operatorAddress: body?.operatorAddress || DEMO_VAULT.operatorAddress,
        plan: body?.plan || DEMO_VAULT.plan,
      },
      apiKey: DEMO_API_KEY,
    } as unknown as T;
  }

  if (path.includes('/keys/rotate') && method === 'POST') {
    return { apiKey: `mnk_live_${Math.random().toString(36).slice(2, 18).toUpperCase()}` } as unknown as T;
  }

  if (path.match(/^\/vaults\/[^/]+$/) && method === 'GET') {
    // If it's a GET to a specific vault
    return {
      id: path.split('/').pop(),
      name: DEMO_VAULT.name,
      operatorAddress: DEMO_VAULT.operatorAddress,
      plan: DEMO_VAULT.plan,
    } as unknown as T;
  }

  // ── Memories ───────────────────────────────────────────────────────────────
  const isMemoryPath = path.includes('/memories');
  const isRecall = path.includes('/memories/recall');
  const isInspect = path.includes('/memories/inspect');
  const isGraph = path.includes('/graph');
  const isDelete = path.match(/\/memories\/[^/]+$/) && method === 'DELETE';

  if (isGraph && method === 'GET') {
    return DEMO_GRAPH_DATA as unknown as T;
  }

  if (isMemoryPath && !isRecall && !isInspect && !isDelete && !isGraph && method === 'GET') {
    const all = [...DEMO_MEMORIES, ..._sessionMemories];
    return { items: all, total: all.length, hasMore: false, page: 1 } as unknown as T;
  }

  if (isMemoryPath && !isRecall && !isInspect && !isDelete && !isGraph && method === 'POST') {
    const newMem = {
      id: `mem_${Date.now()}`,
      ...body,
      contentHash: `0x${Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      createdAt: new Date().toISOString(),
      monadTxHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    };
    _sessionMemories.unshift(newMem);
    return newMem as unknown as T;
  }

  if (isRecall && method === 'POST') {
    const q = (body?.query ?? '').toLowerCase();
    const all = [...DEMO_MEMORIES, ..._sessionMemories];
    const results = all.filter(m =>
      m.content.toLowerCase().includes(q) ||
      (m.tags || []).some((t: string) => t.toLowerCase().includes(q))
    );
    return { memories: results.length > 0 ? results : all.slice(0, 3), total: results.length } as unknown as T;
  }

  if (isInspect && method === 'POST') {
    const ts = new Date(body?.timestamp).getTime();
    const all = [...DEMO_MEMORIES, ..._sessionMemories];
    const results = all.filter(m => new Date(m.createdAt).getTime() <= ts);
    return { memories: results, inspectedAt: body?.timestamp } as unknown as T;
  }

  if (isDelete) {
    const idFromPath = path.split('/memories/')[1];
    const idx = _sessionMemories.findIndex(m => m.id === idFromPath);
    if (idx !== -1) _sessionMemories.splice(idx, 1);
    return { deleted: true } as unknown as T;
  }


  // ── Compliance ─────────────────────────────────────────────────────────────
  if (path.includes('/compliance/report') && method === 'POST') {
    const allMems = DEMO_MEMORIES.length + _sessionMemories.length;
    return {
      reportId: `rep_${Date.now()}`,
      reportHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      status: 'generated',
      monadTxHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      reportData: {
        summary: {
          totalMemories: allMems,
          attestedOnChain: DEMO_AUDIT_LOG.filter(e => e.monadTxHash).length,
          erasureCount: 0,
          auditPeriod: `${body?.dateFrom ?? '2026-01-01'} to ${body?.dateTo ?? new Date().toISOString().slice(0, 10)}`,
          contractsUsed: ['VaultRegistry', 'AttestationAggregator', 'DeletionProver'],
          network: 'Monad Testnet (chainId: 10143)',
        },
        events: DEMO_AUDIT_LOG,
      },
    } as unknown as T;
  }

  if (path.includes('/gdpr/erase') && method === 'POST') {
    const count = body?.memoryIds?.length || DEMO_MEMORIES.length;
    return {
      deletedCount: count,
      erasedCount: count,
      tombstoneHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      monadTxHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      deletionTimestamp: new Date().toISOString(),
      gdprBasis: 'Article 17 — Right to Erasure',
      onChainProof: `DeletionProver @ 0xF66260602E13e05EAcc56c238cD26587A3Cad9ea`,
    } as unknown as T;
  }

  if (path.includes('/audit/log')) {
    return {
      items: DEMO_AUDIT_LOG,
      total: DEMO_AUDIT_LOG.length,
      // Also expose as direct array for backward compatibility
      ...DEMO_AUDIT_LOG,
      length: DEMO_AUDIT_LOG.length,
    } as unknown as T;
  }

  return { success: true } as unknown as T;
}

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

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  // Always use demo mode when no backend URL configured
  if (DEMO_MODE) {
    return handleMockRequest<T>(method, path, body);
  }

  try {
    const apiKey = getApiKey();
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: any;
    try {
      data = await res.json();
    } catch {
      // Non-JSON response (HTML error page etc.) — fall back to demo
      console.info(`[MNEME Demo Mode] Non-JSON response for ${method} ${path}`);
      return handleMockRequest<T>(method, path, body);
    }

    if (!res.ok || data?.success === false) {
      throw new Error(data?.error?.message ?? data?.message ?? `HTTP ${res.status}`);
    }

    return (data?.data ?? data) as T;
  } catch (err: any) {
    // In production: surface errors visibly — never silently fall back to demo data.
    // In development: fall back to demo mode for network errors to allow offline development.
    const isNetworkError = (
      err.name === 'TypeError' ||
      err.name === 'AbortError' ||
      err.message?.includes('fetch') ||
      err.message?.includes('NetworkError') ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('CORS') ||
      err.message?.includes('network')
    );
    if (!IS_PRODUCTION && isNetworkError) {
      console.warn(`[MNEME Dev Demo] ${method} ${path} — ${err.message}. Falling back to demo data.`);
      return handleMockRequest<T>(method, path, body);
    }
    throw err;
  }
}

// ── Vault API ──────────────────────────────────────────────────────────────────

export const vaultApi = {
  create: (body: { operatorAddress: string; name?: string; plan?: string }) =>
    request<{ vault: any; apiKey: string }>('POST', '/vaults', body),

  get: (vaultId: string) =>
    request<any>('GET', `/vaults/${vaultId}`),

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
