interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Retrieves an item from the cache.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return entry.data;
  }

  /**
   * Sets an item in the cache.
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, { data, timestamp: Date.now() + (ttl || this.defaultTTL) });
  }

  /**
   * Removes items matching the key pattern (string includes or regex).
   */
  invalidate(keyPattern: string | RegExp): void {
    if (typeof keyPattern === "string") {
      for (const key of this.cache.keys()) {
        if (key.includes(keyPattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      for (const key of this.cache.keys()) {
        if (keyPattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Clears the entire cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Stale-While-Revalidate fetch wrapper.
   * Instantly returns cached data if available.
   * If stale (or no cache), fetches fresh data in the background and updates the cache.
   */
  async swr<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const entry = this.cache.get(key);
    const isStale = !entry || Date.now() > entry.timestamp;

    if (isStale) {
      // Fetch fresh data in the background
      const fetchPromise = fetcher()
        .then((data) => {
          this.cache.set(key, { data, timestamp: Date.now() + ttl });
          return data;
        })
        .catch((err) => {
          console.error(`SWR fetch failed for key: ${key}`, err);
          throw err;
        });

      // If we don't have any cached data at all, we MUST wait for the fetch
      if (!entry) {
        return fetchPromise;
      }
    }

    // Return cached (potentially stale) data instantly
    return entry!.data;
  }
}

export const apiCache = new APICache();
