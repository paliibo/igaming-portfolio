import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RedisService } from './redis.provider.js';

export interface RateLimitOptions {
  /** Max requests per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Key prefix; defaults to route path. */
  name?: string;
}

export const RATE_LIMIT_KEY = 'rate_limit';
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

/** Fixed-window limiter backed by Redis INCR + EXPIRE, keyed by user id or client IP. */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;
    const req = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const identity = req.user?.id ?? req.ip ?? 'anonymous';
    const name = options.name ?? `${req.method}-${req.route?.path ?? req.path}`;
    const key = `ratelimit:${name}:${identity}`;
    const count = await this.redis.client.incr(key);
    if (count === 1) await this.redis.client.expire(key, options.windowSeconds);
    if (count > options.limit) {
      const ttl = await this.redis.client.ttl(key);
      throw new HttpException(
        {
          statusCode: 429,
          code: 'RATE_LIMITED',
          message: `Too many requests, retry in ${Math.max(ttl, 1)}s`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
