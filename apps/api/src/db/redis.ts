import { Redis } from 'ioredis';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('redis');

// ── Singleton connection ────────────────────────────────────────────────────

let _redis: Redis | null = null;
let _available = false;

function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn('REDIS_URL not set — Redis features disabled (no-cache mode)');
    return null;
  }

  try {
    _redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    _redis.on('connect', () => {
      _available = true;
      logger.info('Redis connected');
    });

    _redis.on('error', (err: Error) => {
      if (_available) {
        logger.warn({ err: err.message }, 'Redis connection error — degraded to no-cache mode');
        _available = false;
      }
    });

    _redis.on('ready', () => {
      _available = true;
    });

    _redis.connect().catch(() => {
      // Connection will be retried — not fatal
    });

    return _redis;
  } catch (err) {
    logger.warn({ err }, 'Failed to create Redis client — no-cache mode');
    return null;
  }
}

export const redis = {
  get isAvailable() { return _available; },
  getInstance: getRedis,
};

// ── Session helpers ─────────────────────────────────────────────────────────

/**
 * Store a JSON value with TTL (seconds).
 */
export async function setSession(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const client = getRedis();
  if (!client || !_available) return;
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Non-fatal — degrade gracefully
  }
}

/**
 * Retrieve a JSON value. Returns null if missing or Redis unavailable.
 */
export async function getSession<T = unknown>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client || !_available) return null;
  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Delete a session key.
 */
export async function deleteSession(key: string): Promise<void> {
  const client = getRedis();
  if (!client || !_available) return;
  try {
    await client.del(key);
  } catch {
    // Non-fatal
  }
}

// ── Working memory cache ────────────────────────────────────────────────────

/**
 * Cache plaintext memory content in Redis (working memory layer).
 * Default TTL: 5 minutes.
 */
export async function cacheMemory(
  vaultId: string,
  memoryId: string,
  content: string,
  ttlSeconds = 300,
): Promise<void> {
  await setSession(`mem:${vaultId}:${memoryId}`, { content, cachedAt: Date.now() }, ttlSeconds);
}

/**
 * Retrieve a cached memory's plaintext content. Returns null if not in cache.
 */
export async function getCachedMemory(vaultId: string, memoryId: string): Promise<string | null> {
  const cached = await getSession<{ content: string; cachedAt: number }>(`mem:${vaultId}:${memoryId}`);
  return cached?.content ?? null;
}

/**
 * Get all cached memory keys for a vault (for hot-read augmentation in recall).
 */
export async function getVaultHotMemoryIds(vaultId: string): Promise<string[]> {
  const client = getRedis();
  if (!client || !_available) return [];
  try {
    const keys = await client.keys(`mem:${vaultId}:*`);
    return keys.map((k: string) => k.split(':')[2]).filter(Boolean) as string[];
  } catch {
    return [];
  }
}

// Initialise on module load
getRedis();
