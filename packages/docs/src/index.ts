import { TritioPlugin } from 'tritio';
import { generateOpenApiSpec } from './openapi';
import { generateScalarHtml } from './scalar';

export interface DocsOptions {
  path?: string;
  title?: string;
  version?: string;
}

export const docs =
  (options: DocsOptions = {}): TritioPlugin =>
  (app) => {
    const path = options.path || '/docs';

    // CAMBIO 2: Usar app.routes (el getter público) en vez de app.registry
    app.h3.on('GET', `${path}/json`, () => generateOpenApiSpec(app.routes));

    app.h3.on('GET', path, () => {
      const html = generateScalarHtml(`${path}/json`);
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    });

    return app;
  };
