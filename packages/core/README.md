# Tritio

**The fast, opinionated H3 framework.**

Tritio is a modern backend framework built on top of [H3](https://github.com/unjs/h3) (the HTTP engine behind Nuxt and Nitro). It is designed to run natively on **Bun**, but is fully compatible with any environment that supports Web Standards (Node.js, Cloudflare Workers, etc.).

Its core philosophy is **Extreme End-to-End Type Safety** and **Performance**, combining the raw speed of H3 with a superior Developer Experience (DX) inspired by tools like ElysiaJS and Fastify, but architected for robust, enterprise-grade applications.

## Core Features

- **Built on H3 (Web Standards)**: Leverages the performance and compatibility of the H3 engine.
- **TypeBox First-Class Integration**: Native input validation and automatic type inference for Body, Query, and Params. No more manual interface duplication.
- **Modular & Scalable**: Native support for nested applications via `.mount()`. Perfect for monorepos and Vertical Slicing architectures.
- **Auto-Documentation**: Automatic OpenAPI 3.1 generation and integrated [Scalar](https://scalar.com/) UI for testing your API.
- **Developer Experience**: Fluent, chainable API request handling (`app.get(...).post(...)`), centralized error handling, and robust CORS support.

## Quick Start

### Installation

Tritio works best with Bun, but you can use your preferred package manager.

```bash
bun add tritio
```

### Hello World

Create a simple server in `src/index.ts`:

```typescript
import { Tritio, t } from 'tritio';

const app = new Tritio();

app.get(
  '/',
  {
    response: t.String(),
  },
  () => 'Hello from Tritio'
);

app.listen(3000);
```

Run it with:

```bash
bun run src/index.ts
```

## Features in Detail

### End-to-End Type Safety

Tritio infers TypeScript types directly from your validation schemas. You define the schema, and `ctx.body`, `ctx.query`, and your return types are strongly typed.

```typescript
import { Tritio, t } from 'tritio';

const app = new Tritio();

app.post(
  '/users',
  {
    body: t.Object({
      name: t.String(),
      age: t.Number(),
    }),
    response: t.Object({
      id: t.Number(),
      message: t.String(),
    }),
  },
  (ctx) => {
    // ctx.body is strictly typed: { name: string; age: number }
    const { name, age } = ctx.body;

    return {
      id: 1,
      message: `User ${name} created successfully`,
    };
  }
);
```

### Modular Architecture (Grouping & Mounting)

Tritio shines in complex applications. You can group routes or mount entirely separate application instances.

#### Grouping Routes

Organize related routes under a common prefix.

```typescript
app.group('/api/v1', (api) => {
  api.get('/status', {}, () => ({ status: 'ok' }));

  api.group('/users', (users) => {
    users.get('/', {}, () => ['Alice', 'Bob']);
  });
});
```

#### Mounting Sub-Apps

For larger systems, separate your domains into independent Tritio instances and assemble them.

```typescript
// auth.module.ts
const authApp = new Tritio();
authApp.post('/login', {}, () => 'Login logic');

// billing.module.ts
const billingApp = new Tritio();
billingApp.get('/invoices', {}, () => ['Inv-001', 'Inv-002']);

// main.ts
const app = new Tritio();
app.mount('/auth', authApp); // Accessible at /auth/login
app.mount('/billing', billingApp); // Accessible at /billing/invoices
```

### Auto-Documentation

Tritio automatically generates an OpenAPI 3.1 specification from your routes and schemas. It includes **Scalar**, a modern and beautiful API reference UI.

Simply call `app.docs()` to enable it.

```typescript
const app = new Tritio();

// ... define your routes ...

// Enable documentation at /docs
app.docs();

app.listen(3000);
```

Visit `http://localhost:3000/docs` to explore and test your API.

### Creating Custom Plugins

Tritio plugins are functions that take an app instance and return it (potentially with modified types).

#### 1. Simple Plugin (No Context Changes)

For plugins that attach global middleware or routes but don't modify the `ctx` object.

```typescript
import { Tritio, TritioDefs } from 'tritio';

export const myLoggerPlugin = () => {
  // Generics ensure type preservation
  return <Defs extends TritioDefs, Schema>(app: Tritio<Defs, Schema>): Tritio<Defs, Schema> => {
    app.onRequest(async (event) => {
      console.log(`[Request] ${event.path}`);
    });

    return app;
  };
};

// Usage
app.use(myLoggerPlugin());
```

#### 2. Context Plugin (Extending `ctx`)

For plugins that add properties to the request context (e.g. `ctx.user`).

```typescript
import { Tritio, TritioDefs, asPlugin } from 'tritio';

type MyContext = {
  timestamp: number;
};

export const timestampPlugin = () => {
  return <Defs extends TritioDefs, Schema>(
    app: Tritio<Defs, Schema>
  ): Tritio<
    // Merge new context into the 'store' property of Defs
    {
      decorators: Defs['decorators'];
      store: Defs['store'] & MyContext;
      schema: Defs['schema'];
    },
    Schema
  > => {
    app.onRequest(async (event) => {
      // Attach value to context
      event.context.timestamp = Date.now();
    });

    // Use 'asPlugin' helper to cast the app to the new type safely
    return asPlugin(app);
  };
};

// Usage
app.use(timestampPlugin()).get('/', {}, (ctx) => {
  return { time: ctx.timestamp }; // Typed!
});
```

## License

MIT
