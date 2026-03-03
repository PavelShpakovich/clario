/**
 * Request deduplication cache
 * Prevents duplicate fetch requests within the same render cycle
 *
 * This implements the React 18+ convention for data fetching:
 * A single promise is created per request, preventing race conditions
 */

type CacheKey = string;
type CacheValue = Promise<unknown> | unknown;

const globalCache = new Map<CacheKey, CacheValue>();

/**
 * Wrapper for data fetching that deduplicates requests
 * Returns the same promise if called with the same key before resolution
 *
 * @example
 * // First call creates promise and stores it
 * const user = await cachedFetch('user-123', async () => fetchUser('123'));
 *
 * // Second call in same render returns the SAME promise
 * const user2 = await cachedFetch('user-123', async () => fetchUser('123'));
 * // user === user2 (same promise instance)
 */
export function cachedFetch<T>(key: CacheKey, fetcher: () => Promise<T>): Promise<T> {
  if (globalCache.has(key)) {
    return globalCache.get(key) as Promise<T>;
  }

  const promise = fetcher().then(
    (result) => {
      // Cache successful result
      globalCache.set(key, result);
      return result;
    },
    (error) => {
      // Clean up on error so retry can happen
      globalCache.delete(key);
      throw error;
    },
  );

  globalCache.set(key, promise);
  return promise;
}

/**
 * Clear the deduplication cache
 * Useful for testing or manual cache invalidation
 */
export function clearDataCache(): void {
  globalCache.clear();
}

/**
 * Clear specific cache entry
 */
export function clearCacheKey(key: CacheKey): void {
  globalCache.delete(key);
}

/**
 * Generate cache key from function name and args
 * @example
 * const key = generateCacheKey('fetchUser', 'user-123', 'active');
 * // key = 'fetchUser:user-123:active'
 */
export function generateCacheKey(...parts: (string | number)[]): CacheKey {
  return parts.join(':');
}

/**
 * Create memoized server function
 * Automatically deduplicates calls with same arguments
 *
 * @example
 * const memoizedFetch = memoizeServerFunction(fetchUserDetails);
 * const user = await memoizedFetch('user-123');
 */
export function memoizeServerFunction<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  keyPrefix?: string,
): T {
  return (async (...args: unknown[]) => {
    const key = generateCacheKey(keyPrefix || fn.name, ...args.map((arg) => JSON.stringify(arg)));
    return cachedFetch(key, () => fn(...args));
  }) as unknown as T;
}

/**
 * Cache configuration for different data types
 * Defines TTL and cache invalidation strategy
 */
export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  invalidateOn?: string[]; // Events that invalidate cache
  revalidateInterval?: number; // Auto-revalidate interval
}

/**
 * Advanced cache with TTL and invalidation
 */
class DataCache {
  private cache = new Map<string, { value: unknown; timestamp: number; config: CacheConfig }>();

  set(key: string, value: unknown, config: CacheConfig = {}): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      config,
    });
  }

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const { value, timestamp, config } = entry;
    const { ttl = Infinity } = config;

    // Check if expired
    if (Date.now() - timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    return value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(tags: string[]): void {
    const keysToDelete: string[] = [];

    for (const [key, { config }] of this.cache.entries()) {
      if (config.invalidateOn?.some((tag) => tags.includes(tag))) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

export const dataCache = new DataCache();
