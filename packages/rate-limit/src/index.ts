import { type TritioPlugin } from 'tritio';
import { getRequestIP, type H3Event } from 'h3';
import { TooManyRequestsException } from 'tritio';

export interface RateLimitStore {
  increment(key: string): Promise<{ totalHits: number; resetTime: Date }>;

  decrement(key: string): Promise<void>;

  resetKey(key: string): Promise<void>;
}

interface MemoryRecord {
  count: number;
  resetTime: number;
}

export class MemoryStore implements RateLimitStore {
  private hits = new Map<string, MemoryRecord>();
  private windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const now = Date.now();
    const record = this.hits.get(key);

    if (!record || now > record.resetTime) {
      const resetTime = now + this.windowMs;
      this.hits.set(key, { count: 1, resetTime });
      return { totalHits: 1, resetTime: new Date(resetTime) };
    }

    record.count++;
    return { totalHits: record.count, resetTime: new Date(record.resetTime) };
  }

  async decrement(key: string): Promise<void> {
    const record = this.hits.get(key);
    if (record && record.count > 0) {
      record.count--;
    }
  }

  async resetKey(key: string): Promise<void> {
    this.hits.delete(key);
  }

  getStats(key: string): MemoryRecord | undefined {
    return this.hits.get(key);
  }
}

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;

  /**
   * Custom error message or response body when rate limit is exceeded.
   * @default { error: 'Too Many Requests' }
   */
  message?: string | object;

  /**
   * Enable standard RateLimit headers (draft spec).
   * - RateLimit-Limit: Maximum requests allowed
   * - RateLimit-Remaining: Requests remaining
   * - RateLimit-Reset: Unix timestamp when window resets
   * @default true
   */
  standardHeaders?: boolean;

  /**
   * Enable legacy X-RateLimit-* headers.
   * - X-RateLimit-Limit
   * - X-RateLimit-Remaining
   * - X-RateLimit-Reset
   * @default false
   */
  legacyHeaders?: boolean;

  /**
   * When true, successful requests (2xx status) won't be counted.
   * @default false
   */
  skipSuccessfulRequests?: boolean;

  /**
   * When true, failed requests (4xx/5xx status) won't be counted.
   * @default false
   */
  skipFailedRequests?: boolean;

  /**
   * Function to generate custom rate limit key.
   * @default IP address extraction
   */
  keyGenerator?: (event: H3Event) => string | Promise<string>;

  /**
   * Function to determine if rate limiting should be skipped for this request.
   * @default undefined (never skip)
   */
  skip?: (event: H3Event) => boolean | Promise<boolean>;

  /**
   * Custom store implementation.
   * @default MemoryStore
   */
  store?: RateLimitStore;

  /**
   * Callback function called when rate limit is reached.
   */
  onLimitReached?: (event: H3Event, key: string) => void | Promise<void>;
}

export const rateLimit = (options: RateLimitOptions = {}): TritioPlugin => {
  const windowMs = options.windowMs ?? 60 * 1000;
  const max = options.max ?? 100;
  const message = options.message ?? { error: 'Too Many Requests' };
  const standardHeaders = options.standardHeaders ?? true;
  const legacyHeaders = options.legacyHeaders ?? false;
  const skipSuccessfulRequests = options.skipSuccessfulRequests ?? false;
  const skipFailedRequests = options.skipFailedRequests ?? false;
  const keyGenerator = options.keyGenerator ?? defaultKeyGenerator;
  const skip = options.skip;
  const onLimitReached = options.onLimitReached;

  const store = options.store ?? new MemoryStore(windowMs);

  return (app) => {
    const requestKeys = new WeakMap<H3Event, string>();

    app.onRequest(async (event: H3Event) => {
      if (skip && (await skip(event))) {
        return;
      }
      const key = await keyGenerator(event);
      requestKeys.set(event, key);

      const { totalHits, resetTime } = await store.increment(key);

      const remaining = Math.max(0, max - totalHits);

      if (standardHeaders) {
        event.res.headers.set('RateLimit-Limit', max.toString());
        event.res.headers.set('RateLimit-Remaining', remaining.toString());
        event.res.headers.set('RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000).toString());
      }

      if (legacyHeaders) {
        event.res.headers.set('X-RateLimit-Limit', max.toString());
        event.res.headers.set('X-RateLimit-Remaining', remaining.toString());
        event.res.headers.set(
          'X-RateLimit-Reset',
          Math.ceil(resetTime.getTime() / 1000).toString()
        );
      }

      if (totalHits > max) {
        const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);

        if (onLimitReached) {
          await onLimitReached(event, key);
        }

        const errorMessage = typeof message === 'string' ? message : undefined;
        const errorCause = typeof message === 'object' ? message : undefined;

        throw new TooManyRequestsException({
          message: errorMessage,
          cause: errorCause,
          res: new Response(
            JSON.stringify(typeof message === 'object' ? message : { error: message }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': retryAfter.toString(),
                ...(standardHeaders && {
                  'RateLimit-Limit': max.toString(),
                  'RateLimit-Remaining': '0',
                  'RateLimit-Reset': Math.ceil(resetTime.getTime() / 1000).toString(),
                }),
                ...(legacyHeaders && {
                  'X-RateLimit-Limit': max.toString(),
                  'X-RateLimit-Remaining': '0',
                  'X-RateLimit-Reset': Math.ceil(resetTime.getTime() / 1000).toString(),
                }),
              },
            }
          ),
        });
      }
    });

    if (skipSuccessfulRequests || skipFailedRequests) {
      app.lifecycle.addResponse(async (response: Response, event: H3Event) => {
        const key = requestKeys.get(event);
        if (!key) return;

        const status = response.status;

        const shouldDecrement =
          (skipSuccessfulRequests && status >= 200 && status < 300) ||
          (skipFailedRequests && status >= 400);

        if (shouldDecrement) {
          await store.decrement(key);
        }
      });
    }

    return app;
  };
};

function defaultKeyGenerator(event: H3Event): string {
  const ip = getRequestIP(event, { xForwardedFor: true });
  return ip || 'unknown';
}

export { TooManyRequestsException } from 'tritio';
