/**
 * Redis-backed distributed rate limiter.
 *
 * Activated when REDIS_URL is configured in environment variables.
 * Uses atomic Redis MULTI/EXEC (pipeline) with INCR + EXPIRE on a fixed window.
 *
 * Key format: rl:<key>:<window_start_ms>
 * Fails open on Redis connection/execution errors for maximum availability.
 */

import Redis from 'ioredis';
import type { RateLimitOptions, RateLimitResult } from './rate-limit';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!redisClient) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 2000,
      });
      redisClient.on('error', (err) => {
        console.error('[rate-limit-redis] Redis error:', err.message);
      });
    } catch (err) {
      console.error(
        '[rate-limit-redis] Failed to initialize Redis client:',
        err
      );
      redisClient = null;
    }
  }
  return redisClient;
}

export async function checkRateLimitRedis(
  key: string,
  { limit, windowMs }: RateLimitOptions
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const reset = windowStart + windowMs;

  if (!redis) {
    // Fail open if Redis is not configured or client creation failed
    return { success: true, remaining: limit - 1, reset, limit };
  }

  const redisKey = `rl:${key}:${windowStart}`;
  const ttlSeconds = Math.ceil((reset - now) / 1000) + 1;

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.expire(redisKey, ttlSeconds);
    const results = await pipeline.exec();

    if (!results || !results[0]) {
      return { success: true, remaining: limit - 1, reset, limit };
    }

    const [incrErr, countVal] = results[0];
    if (incrErr) {
      console.error('[rate-limit-redis] INCR error, failing open:', incrErr);
      return { success: true, remaining: limit - 1, reset, limit };
    }

    const count =
      typeof countVal === 'number' ? countVal : Number(countVal) || 1;

    if (count > limit) {
      return { success: false, remaining: 0, reset, limit };
    }

    return { success: true, remaining: limit - count, reset, limit };
  } catch (err) {
    console.error(
      '[rate-limit-redis] Error checking rate limit, failing open:',
      err
    );
    return { success: true, remaining: limit - 1, reset, limit };
  }
}

// Alias for matching interface
export { checkRateLimitRedis as checkRateLimit };
