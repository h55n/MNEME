import { afterEach, describe, expect, it, vi } from 'vitest';
import { RerankerService } from '../services/reranker.service.js';
const documents = [{ id: 'one', text: 'test memory' }];
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('optional reranker boundary', () => {
  it('filters malformed, unrelated and duplicate results', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ results: [
      { id: 'one', score: 0.75 }, { id: 'other', score: 1 }, { id: 'one', score: 9 },
      { id: 'one', score: NaN }, { id: 42, score: 1 }, null,
    ] }) })));
    expect(await new RerankerService().rerank('query', documents)).toEqual([{ id: 'one', score: 0.75 }]);
  });
  it('falls back when the response has no result array', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ results: null }) })));
    expect(await new RerankerService().rerank('query', documents)).toEqual([]);
  });
  it('aborts a stalled optional service instead of blocking recall indefinitely', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    })));
    const call = new RerankerService().rerank('query', documents);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await Promise.race([call, Promise.resolve('still-pending')])).toEqual([]);
  });
});
