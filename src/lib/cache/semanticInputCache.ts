/**
 * Semantic input cache for deduplicating identical stateless AI queries.
 * FIFO eviction at max entries, TTL-based expiry.
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_ENTRIES = 50;

interface CacheEntry {
  cachedChunks: Uint8Array[];
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();

export class SemanticInputCache {
  /**
   * Generate a cache key from normalized query text and scope.
   */
  static generateKey(query: string, scope: string): string {
    return `${scope}:${query}`;
  }
}

export const semanticCache = {
  get(key: string): CacheEntry | null {
    const entry = cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      cache.delete(key);
      return null;
    }

    return entry;
  },

  set(key: string, entry: CacheEntry): void {
    // FIFO eviction
    if (cache.size >= CACHE_MAX_ENTRIES) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    cache.set(key, entry);
  },

  clear(): void {
    cache.clear();
  },
};
