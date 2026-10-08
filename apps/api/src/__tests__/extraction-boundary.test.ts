import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExtractionService } from '../services/extraction.service.js';
const input = { content: 'test text', vaultId: 'test-vault', memoryId: 'test-memory', memoryType: 'semantic' };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
describe('optional extraction service boundary', () => {
  it('returns empty output rather than throwing on malformed successful JSON', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', ''); vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ unexpected: true }) })));
    expect(await new ExtractionService().extract(input)).toEqual({ entities: [], facts: [] });
  });
  it('clears its abort timer when connection fails', async () => {
    vi.useFakeTimers(); vi.stubEnv('ANTHROPIC_API_KEY', ''); vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await new ExtractionService().extract(input)).toEqual({ entities: [], facts: [] });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('keeps only well-formed bounded entities and facts', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({
      entities: [{ label: 'TypeScript', type: 'SKILL' }, null, { label: 7, type: 'SKILL' }],
      facts: [{ subject: 'agent', subjectType: 'CONCEPT', object: 'TypeScript', objectType: 'SKILL', fact: 'uses', confidence: 0.9 }, { confidence: 5 }],
    }) })));
    const result = await new ExtractionService().extract(input);
    expect(result.entities).toEqual([{ label: 'TypeScript', type: 'SKILL' }]);
    expect(result.facts).toHaveLength(1);
  });
});
