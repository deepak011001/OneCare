import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import type { CachePort } from '@onecare/cache';
import type { OneCareEnv } from '@onecare/config';
import { APP_TOKENS } from '../tokens';

@Injectable()
export class RedisCacheService implements CachePort, OnModuleDestroy {
  private readonly redis: Redis;

  constructor(@Inject(APP_TOKENS.ENV) env: OneCareEnv) {
    this.redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false,
    });
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.redis.set(key, value, 'EX', ttlSeconds);
      return;
    }
    await this.redis.set(key, value);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const value = await this.redis.incr(key);
    if (value === 1 && ttlSeconds !== undefined) {
      await this.redis.expire(key, ttlSeconds);
    }
    return value;
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
