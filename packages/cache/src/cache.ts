export interface CachePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string, ttlSeconds?: number): Promise<number>;
}

export interface SessionCacheRecord {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly revoked: boolean;
  readonly absoluteExpiresAt: string;
  readonly idleExpiresAt: string;
}

export interface SessionCachePort {
  get(sessionId: string): Promise<SessionCacheRecord | null>;
  set(record: SessionCacheRecord, ttlSeconds: number): Promise<void>;
  revoke(sessionId: string): Promise<void>;
}

export class InMemoryCachePort implements CachePort {
  private readonly store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      ...(ttlSeconds !== undefined ? { expiresAt: Date.now() + ttlSeconds * 1000 } : {}),
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const current = Number((await this.get(key)) ?? '0') + 1;
    await this.set(key, String(current), ttlSeconds);
    return current;
  }
}
