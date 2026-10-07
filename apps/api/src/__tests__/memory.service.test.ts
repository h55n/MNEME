import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryService } from '../services/memory.service.js';
import { redis } from '../db/redis.js';
import { embeddingService } from '../services/embedding.service.js';
import { db, memories, attestations } from '../db/index.js';

vi.mock('../blockchain/attestation-batcher.js', () => ({
  attestationBatcher: { add: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../services/recall.js', () => ({ recallService: {} }));

// Keep the resilience test independent of model downloads and inference.
vi.mock('../services/embedding.service.js', () => ({
  embeddingService: {
    embed: vi.fn().mockResolvedValue(Array.from({ length: 384 }, (_, i) => i === 0 ? 1 : 0)),
    id: 'test:deterministic:384',
  },
}));

// Mock the Redis database to avoid needing the Docker container
vi.mock('../db/redis.js', () => ({
  redis: {
    getInstance: vi.fn().mockReturnValue({
      rpush: vi.fn(),
    })
  },
}));

// Mock the GraphService to avoid needing the Neo4j container
vi.mock('../services/graph.service.js', () => {
  return {
    GraphService: {
      getInstance: vi.fn().mockReturnValue({
        extractAndStoreGraph: vi.fn().mockResolvedValue(true),
      }),
    }
  }
});

vi.mock('../db/index.js', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue(new Error('Connection refused: Postgres offline'))
      })
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
      })
    })
  },
  memories: {},
  attestations: {},
  vaults: {}
}));

describe('MemoryService Resilience Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fallback to offline Redis queue when primary DB fails', async () => {
    const memoryService = new MemoryService();


    try {
      await memoryService.write(
        'test-vault',
        {
          type: 'semantic',
          content: 'User prefers dark mode.',
          tags: ['preferences'],
          importance: 0.9,
          sourceModel: 'gpt-4o',
          sessionId: 'session-123'
        }
      );
    } catch (e) {
      // It should catch the error and queue it to Redis
    }

    expect(embeddingService.embed).toHaveBeenCalledOnce();
    expect(embeddingService.embed).toHaveBeenCalledWith('User prefers dark mode.');
    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(db.insert).toHaveBeenNthCalledWith(1, memories);
    expect(db.insert).toHaveBeenNthCalledWith(2, attestations);


    // Verify Redis fallback was triggered
    const rClient = redis.getInstance();
    expect(rClient?.rpush).toHaveBeenCalledOnce();
    const queuedCall = (rClient?.rpush as import('vitest').Mock).mock.calls[0];
    expect(queuedCall[0]).toBe('offline_queue:test-vault');
    expect(JSON.parse(queuedCall[1]).content).toBe('User prefers dark mode.');
  });
});
