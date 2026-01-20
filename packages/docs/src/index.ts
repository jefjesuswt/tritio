import { type Tritio } from 'tritio';
import { generateOpenApiSpec } from './openapi';
import { generateScalarHtml } from './scalar';

export interface DocsOptions {
  path?: string;
  title?: string;
  version?: string;
}

export const docs = (options: DocsOptions = {}) => {
  return <Env, Schema>(app: Tritio<Env, Schema>): Tritio<Env, Schema> => {
    const path = options.path || '/docs';

    app.h3.on('GET', `${path}/json`, () => generateOpenApiSpec(app.routes));

    app.h3.on('GET', path, () => {
      const html = generateScalarHtml(`${path}/json`);
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    });

    return app;
  };
};
