import { type Tritio, type TritioDefs } from 'tritio';
import { handleCors, type H3Event, type CorsOptions as H3CorsOptions } from 'h3';

export interface CorsOptions {
  /**
   * Configures the Access-Control-Allow-Origin CORS header.
   * Can be a single origin, array of origins, '*', 'null', or a validation function.
   * @default '*'
   */
  origin?: string | string[] | ((origin: string) => boolean);

  /**
   * Configures the Access-Control-Allow-Methods CORS header.
   * Can be a comma-separated string or an array.
   * @default '*'
   */
  methods?: string | string[];

  /**
   * Configures the Access-Control-Allow-Headers CORS header.
   * Can be a comma-separated string or an array.
   * @default '*'
   */
  allowHeaders?: string | string[];

  /**
   * Configures the Access-Control-Expose-Headers CORS header.
   * Can be a comma-separated string or an array.
   */
  exposeHeaders?: string | string[];

  /**
   * Configures the Access-Control-Allow-Credentials CORS header.
   */
  credentials?: boolean;

  /**
   * Configures the Access-Control-Max-Age CORS header.
   * Can be a number (seconds) or string.
   */
  maxAge?: number | string;

  /**
   * Status code for the preflight response.
   * @default 204
   */
  preflight?: {
    statusCode?: number;
  };
}

function normalizeOrigin(origin: CorsOptions['origin']): H3CorsOptions['origin'] {
  if (origin === undefined || origin === '*') return '*';
  if (origin === 'null') return 'null';
  if (typeof origin === 'function') return origin;

  if (typeof origin === 'string') return [origin];
  return origin;
}

function normalizeArray(val: string | string[] | undefined): string[] | '*' | undefined {
  if (val === undefined || val === '*') return '*';
  if (Array.isArray(val)) return val;
  return val.split(',').map((s) => s.trim());
}

function normalizeMaxAge(val: number | string | undefined): string | undefined {
  if (val === undefined) return undefined;
  return val.toString();
}

export const cors = (options: CorsOptions = {}) => {
  return <Defs extends TritioDefs, Schema>(app: Tritio<Defs, Schema>): Tritio<Defs, Schema> => {
    app.onRequest((event: H3Event) => {
      const h3Options: H3CorsOptions = {
        origin: normalizeOrigin(options.origin),
        methods: normalizeArray(options.methods),
        allowHeaders: normalizeArray(options.allowHeaders),
        exposeHeaders: normalizeArray(options.exposeHeaders),
        credentials: options.credentials,
        maxAge: normalizeMaxAge(options.maxAge),
        preflight: {
          statusCode: options.preflight?.statusCode ?? 204,
        },
      };

      const handled = handleCors(event, h3Options);

      if (handled) {
        // Preflight handled
      }
    });

    return app;
  };
};
