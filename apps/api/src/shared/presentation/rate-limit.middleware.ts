import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { CachePort } from '@onecare/cache';
import type { OneCareEnv } from '@onecare/config';
import { APP_TOKENS } from '../tokens';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(
    @Inject(APP_TOKENS.CACHE) private readonly cache: CachePort,
    @Inject(APP_TOKENS.ENV) private readonly env: OneCareEnv,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const isAuth = req.path.startsWith('/v1/auth');
    const limit = isAuth ? this.env.AUTH_RATE_LIMIT_LIMIT : this.env.RATE_LIMIT_LIMIT;
    const ttl = this.env.RATE_LIMIT_TTL_SECONDS;
    const key = `rl:${req.ip}:${isAuth ? 'auth' : 'api'}:${Math.floor(Date.now() / (ttl * 1000))}`;

    try {
      const count = await this.cache.incr(key, ttl);
      res.setHeader('x-ratelimit-limit', String(limit));
      res.setHeader('x-ratelimit-remaining', String(Math.max(0, limit - count)));
      if (count > limit) {
        res.status(429).json({
          type: 'https://onecare.local/errors/rate-limit',
          title: 'Too Many Requests',
          status: 429,
          detail: 'Too many requests',
          code: 'RATE_LIMITED',
        });
        return;
      }
      next();
    } catch {
      // Fail open if cache is unavailable — still protect via upstream gateway later
      next();
    }
  }
}
