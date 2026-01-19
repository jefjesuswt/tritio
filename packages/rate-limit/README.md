# @tritio/rate-limit

Rate limiting middleware for Tritio framework.

## Features

- **IP-based rate limiting** with customizable key generation
- **Standard RateLimit headers** (draft spec)
- **Extensible store interface** (in-memory by default)
- **Flexible configuration** with skip conditions and callbacks
- **TypeScript support** with full type definitions

## Installation

```bash
bun add @tritio/rate-limit
```

## Basic Usage

```typescript
import { Tritio } from 'tritio';
import { rateLimit } from '@tritio/rate-limit';

const app = new Tritio();

// Apply rate limiting globally
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
  })
);

app.get('/api/hello', {}, () => ({ message: 'Hello!' }));

app.listen(3000);
```

## Configuration Options

```typescript
interface RateLimitOptions {
  windowMs?: number; // Time window in ms (default: 60000)
  max?: number; // Max requests per window (default: 100)
  message?: string | object; // Custom error message
  standardHeaders?: boolean; // Enable RateLimit-* headers (default: true)
  legacyHeaders?: boolean; // Enable X-RateLimit-* headers (default: false)
  skipSuccessfulRequests?: boolean; // Don't count 2xx (default: false)
  skipFailedRequests?: boolean; // Don't count 4xx/5xx (default: false)
  keyGenerator?: (event) => string; // Custom key function
  skip?: (event) => boolean; // Skip condition
  store?: RateLimitStore; // Custom store
  onLimitReached?: (event, key) => void; // Callback
}
```

## Advanced Examples

### Custom Key Generation

```typescript
app.use(
  rateLimit({
    max: 10,
    keyGenerator: (event) => {
      // Rate limit by user ID instead of IP
      const userId = event.context.user?.id;
      return userId || 'anonymous';
    },
  })
);
```

### Skip Certain Routes

```typescript
app.use(
  rateLimit({
    max: 100,
    skip: (event) => {
      // Don't rate limit health check endpoint
      return event.path === '/health';
    },
  })
);
```

### Custom Error Message

```typescript
app.use(
  rateLimit({
    max: 5,
    windowMs: 60000,
    message: {
      error: 'Too many requests',
      details: 'Please try again in 1 minute',
    },
  })
);
```

### Custom Store (e.g., Redis)

```typescript
import { RateLimitStore } from '@tritio/rate-limit';

class RedisStore implements RateLimitStore {
  async increment(key: string) {
    // Implement using Redis
    // Return { totalHits, resetTime }
  }
  async decrement(key: string) {
    /* ... */
  }
  async resetKey(key: string) {
    /* ... */
  }
}

app.use(
  rateLimit({
    store: new RedisStore(),
  })
);
```

## Response Headers

When rate limiting is applied, the following headers are added:

### Standard Headers (enabled by default)

- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Unix timestamp when the window resets

### Legacy Headers (optional)

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

### When Limit Exceeded

- `Retry-After`: Seconds until the limit resets

## Important Notes

⚠️ **Serverless/Cluster Deployments**: The default `MemoryStore` works only for single-process deployments. For serverless, clusters, or multi-process environments, implement a custom store using Redis or another distributed storage.

## License

MIT
