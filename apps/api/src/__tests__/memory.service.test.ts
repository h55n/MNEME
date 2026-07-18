import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryService } from '../services/memory.service.js';
import { redis } from '../db/redis.js';
import { GraphService } from '../services/graph.service.js';

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
        },
        'operator-public-key'
      );
    } catch (e) {
      // It should catch the error and queue it to Redis
    }

    // Verify Redis fallback was triggered
    const rClient = redis.getInstance();
    expect(rClient?.rpush).toHaveBeenCalled();
    const queuedCall = (rClient?.rpush as import('vitest').Mock).mock.calls[0];
    expect(queuedCall[0]).toBe('offline_queue:test-vault');
    expect(JSON.parse(queuedCall[1]).content).toBe('User prefers dark mode.');
  });
});
