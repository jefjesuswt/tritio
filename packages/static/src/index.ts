/// <reference lib="dom" />
import { defineEventHandler, getRequestURL } from 'h3';
import { createStorage } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';
import { lookup } from 'mrmime';
import { resolve } from 'node:path';
import type { Tritio } from 'tritio';

export interface StaticOptions {
  /**
   * Root directory to serve files from.
   * @default './public'
   */
  root?: string;

  /**
   * URL prefix to mount the static server.
   * @default '/'
   */
  prefix?: string;

  /**
   * Enable SPA mode (fallback to index.html on 404).
   * @default false
   */
  spa?: boolean;
}

export const staticPlugin =
  (options: StaticOptions = {}) =>
  (app: Tritio) => {
    const { root = './public', prefix, spa = false } = options;
    const absRoot = resolve(root);

    // Initialize unstorage with FS driver
    const storage = createStorage({
      driver: fsDriver({ base: absRoot }),
    });

    const h3Handler = defineEventHandler(async (event) => {
      // 1. Determine relative path
      const url = getRequestURL(event);
      let path = url.pathname;

      path = decodeURIComponent(path);

      if (prefix && path.startsWith(prefix)) {
        path = path.slice(prefix.length);
      }

      if (!path.startsWith('/')) path = '/' + path;

      // 2. Lookup Item
      let key = path.replace(/^\//, '');
      if (key === '') key = 'index.html';

      let hasItem = await storage.hasItem(key);

      // 3. Fallback logic
      if (!hasItem) {
        const indexKey = key + '/index.html';
        if (await storage.hasItem(indexKey)) {
          key = indexKey;
          hasItem = true;
        } else if (spa) {
          key = 'index.html';
          hasItem = await storage.hasItem(key);
        }
      }

      if (!hasItem) {
        // Return undefined to let H3 generic 404 handler or other routes handle it
        return;
      }

      // 4. Serve Item
      // getItemRaw returns Buffer | string | null
      const file = await storage.getItemRaw(key);

      if (file === null) return; // Should not happen given hasItem check, but safety first

      const mimeType = lookup(key) || 'application/octet-stream';

      // Return standard Web Response
      // H3 handles this natively and it works across runtimes (Bun, Node, Deno)
      return new Response(file as BodyInit, {
        headers: {
          'Content-Type': mimeType,
        },
      });
    });

    if (prefix) {
      const pathPrefix = prefix.startsWith('/') ? prefix : `/${prefix}`;
      app.h3.use(pathPrefix, h3Handler);
    } else {
      app.h3.use(h3Handler);
    }

    return app;
  };
