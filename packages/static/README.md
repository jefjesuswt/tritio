# @tritio/static

**Static file serving for the Tritio Framework.**

This plugin allows you to serve static files (HTML, CSS, JS, Images, etc.) from your Tritio application with ease and high performance.

It is built on top of `unstorage` and `mrmime`, ensuring runtime-agnostic compatibility (Node.js, Bun, Deno, Workers) and strictly typed responses.

## Installation

```bash
bun add @tritio/static
```

## Usage

Register the plugin in your Tritio application instance.

```typescript
import { Tritio } from 'tritio';
import { staticPlugin } from '@tritio/static';

const app = new Tritio();

// minimal usage (defaults to ./public served at root)
app.use(staticPlugin());

// customized usage
app.use(
  staticPlugin({
    root: './assets', // Directory to serve
    prefix: '/static', // URL prefix
    spa: true, // Enable Single Page Application mode
  })
);

app.listen(3000);
```

## Options

### `root`

- **Type**: `string`
- **Default**: `'./public'`

The absolute or relative path to the directory containing your static files.

### `prefix`

- **Type**: `string`
- **Default**: `undefined` (Served at root `/`)

The URL prefix under which the files will be served. For example, if prefix is `/public`, a file at `./public/image.png` will be accessible via `http://localhost:3000/public/image.png`.

### `spa`

- **Type**: `boolean`
- **Default**: `false`

Enables Single Page Application (SPA) mode. When `true`, any 404 request that does not match a file will fallback and serve `index.html` instead. Perfect for Vue/React/Angular apps handled by client-side routing.

## License

MIT
