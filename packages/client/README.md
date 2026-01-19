# @tritio/client

Type-safe client generator for Tritio applications.

## Installation

```bash
bun add @tritio/client
```

## Features

- **Fully Type-Safe** - End-to-end type safety from server to client
- **Auto-Generated** - Client types are automatically inferred from your Tritio app
- **Zero Config** - Just import your app and get started
- **IntelliSense** - Full autocomplete for routes, inputs, and outputs

## Usage

```typescript
import { createClient, type InferApp } from '@tritio/client';
import type app from './server'; // Your Tritio app

type App = InferApp<typeof app>;

const client = createClient<App>('http://localhost:3000');

// Fully typed request
const response = await client.users.get();
```

## API

### `createClient<T>(baseUrl: string): Client<T>`

Creates a type-safe client for your Tritio application.

**Parameters:**

- `baseUrl` - The base URL of your Tritio server

**Returns:** A fully typed client with methods matching your server routes.

### `type InferApp<T>`

Type helper to infer the app schema from your Tritio instance.

## License

MIT
