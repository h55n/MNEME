import { describe, it, expect, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';

const executed: unknown[] = [];
vi.mock('../db/index.js', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../db/schema.js');
  return { ...actual, db: { execute: vi.fn(async (q: unknown) => { executed.push(q); }) } };
});
vi.mock('../blockchain/attestation-batcher.js', () => ({ attestationBatcher: {} }));
vi.mock('../services/graph.service.js', () => ({ graphService: {} }));
vi.mock('../services/embedding.service.js', () => ({ embeddingService: { id: 'm' } }));

import { memoryService } from '../services/memory.service.js';

describe('reinforceMemories', () => {
  it('builds one placeholder per id, not a tuple inside ANY()', async () => {
    await memoryService.reinforceMemories('v1', ['a', 'b', 'c']);
    const { sql: text, params } = new PgDialect().sqlToQuery(executed[0] as never);
    expect(text).toMatch(/id IN \(\$2, \$3, \$4\)/);
    expect(text).not.toMatch(/ANY/);
    expect(params).toEqual(['v1', 'a', 'b', 'c']);
  });

  it('does nothing for an empty list', async () => {
    executed.length = 0;
    await memoryService.reinforceMemories('v1', []);
    expect(executed).toHaveLength(0);
  });
});
