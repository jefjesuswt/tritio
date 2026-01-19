# @tritio/testing

Testing utilities for Tritio applications.

## Installation

```bash
bun add -d @tritio/testing
```

## Features

- **Simple Testing API** - Easy-to-use `treat` function for testing Tritio apps
- **Type-Safe** - Full TypeScript support
- **Fast** - Built on Bun's test runner
- **Zero Config** - Works seamlessly with your Tritio apps

## Usage

```typescript
import { describe, test, expect } from 'bun:test';
import { treat } from '@tritio/testing';
import { app } from './app';

describe('API Tests', () => {
  test('GET /users returns users list', async () => {
    const res = await treat(app).get('/users');

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.users).toBeArray();
  });

  test('POST /users creates a new user', async () => {
    const res = await treat(app).post('/users').send({ name: 'John', email: 'john@example.com' });

    expect(res.status).toBe(201);
  });
});
```

## API

### `treat(app: Tritio): TestClient`

Creates a test client for your Tritio application.

**Methods:**

- `get(path: string)` - Make a GET request
- `post(path: string)` - Make a POST request
- `put(path: string)` - Make a PUT request
- `delete(path: string)` - Make a DELETE request
- `patch(path: string)` - Make a PATCH request
- `send(data: any)` - Set request body
- `set(header: string, value: string)` - Set request header

## License

MIT
