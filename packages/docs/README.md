# @tritio/docs

Documentation generator for Tritio applications using Scalar.

## Installation

```bash
bun add @tritio/docs
```

## Features

- **Auto-Generated OpenAPI** - Automatically generate OpenAPI specs from your routes
- **Beautiful UI** - Interactive API documentation using Scalar
- **Type Validation** - Documents request/response schemas from TypeBox
- **Zero Config** - Works out of the box with your Tritio app

## Usage

```typescript
import { Tritio } from 'tritio';
import { docs } from '@tritio/docs';

const app = new Tritio();

// Add your routes
app.get(
  '/users',
  {
    /* schema */
  },
  async (ctx) => {
    return { users: [] };
  }
);

// Mount documentation at /reference
app.use(docs());

app.listen(3000);
// Visit http://localhost:3000/reference for interactive docs
```

## Configuration

```typescript
app.use(
  docs({
    path: '/docs', // Custom docs path (default: '/reference')
    title: 'My API', // API title
    version: '1.0.0', // API version
    description: '...', // API description
  })
);
```

## License

MIT
