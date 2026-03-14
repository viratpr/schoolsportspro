export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

class MemoryCache implements CacheAdapter {
  private store = new Map<string, { value: unknown; expires?: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expires && Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const expires = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expires });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export const cache: CacheAdapter = new MemoryCache();

export function cacheKey(prefix: string, ...parts: string[]): string {
  return [prefix, ...parts].join(':');
}
