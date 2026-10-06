import { describe, it, expect } from 'vitest';
import { EmbeddingService, EmbeddingError, EMBEDDING_DIMS } from '../services/embedding.service.js';

const dot = (a: number[], b: number[]) => a.reduce((sum, x, i) => sum + x * b[i], 0);

describe('EmbeddingService (local model)', () => {
  const service = new EmbeddingService();

  it('returns 384-dimension unit vectors', async () => {
    const v = await service.embed('I live in Pune');
    expect(v).toHaveLength(EMBEDDING_DIMS);
    expect(Math.sqrt(dot(v, v))).toBeCloseTo(1, 3);
    expect(v.some(x => x !== 0)).toBe(true);
  }, 120_000);

  it('ranks related text above unrelated text', async () => {
    const [home, moved, cat] = await service.embedBatch([
      'I live in Pune',
      'I moved to Delhi last month',
      'The cat sat on the mat',
    ]);
    expect(dot(home, moved)).toBeGreaterThan(dot(home, cat));
  }, 120_000);

  it('gives the same vector for the same text, alone or in a batch', async () => {
    const alone = await service.embed('prefers dark mode');
    const [inBatch] = await service.embedBatch(['prefers dark mode', 'something else']);
    expect(dot(alone, inBatch)).toBeGreaterThan(0.999);
  }, 120_000);

  it('handles empty input, empty text and very long text without a zero vector', async () => {
    expect(await service.embedBatch([])).toEqual([]);
    const empty = await service.embed('');
    expect(empty).toHaveLength(EMBEDDING_DIMS);
    const long = await service.embed('memory '.repeat(5000));
    expect(long.some(x => x !== 0)).toBe(true);
  }, 120_000);

  it('names itself with the model and size, so vectors are never mixed', () => {
    expect(service.id).toBe('local:Xenova/all-MiniLM-L6-v2:384');
  });
});

describe('EmbeddingService configuration', () => {
  const withEnv = (env: Record<string, string | undefined>, fn: () => void) => {
    const saved = { ...process.env };
    Object.assign(process.env, env);
    for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k];
    try {
      fn();
    } finally {
      process.env = saved;
    }
  };

  it('rejects an unknown EMBEDDER instead of guessing', () => {
    withEnv({ EMBEDDER: 'banana' }, () => {
      expect(() => new EmbeddingService()).toThrow(EmbeddingError);
    });
  });

  it('rejects EMBEDDER=openai without a key', () => {
    withEnv({ EMBEDDER: 'openai', OPENAI_API_KEY: undefined }, () => {
      expect(() => new EmbeddingService()).toThrow(/OPENAI_API_KEY/);
    });
  });
});
