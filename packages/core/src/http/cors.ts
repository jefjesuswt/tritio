import { H3Event, handleCors } from 'h3';
import type { CorsOptions } from '../types';

const normalizeOrigin = (origin: CorsOptions['origin']) => {
  if (origin === undefined) {
    return '*';
  }

  if (typeof origin === 'function' || Array.isArray(origin)) {
    return origin;
  }

  if (origin === '*' || origin === 'null') {
    return origin;
  }

  return [origin];
};

export const useCors = (event: H3Event, options?: CorsOptions) => {
  const defaults = {
    origin: '*',
    methods: '*',
    allowHeaders: '*',
    preflight: { statusCode: 204 }
  } as const;

  const rawOrigin = options?.origin ?? defaults.origin;
  const methods = options?.methods ?? defaults.methods;
  const allowHeaders = options?.allowHeaders ?? defaults.allowHeaders
  const maxAge = options?.maxAge !== undefined ? options.maxAge.toString() : undefined;

  return handleCors(event, {
    origin: normalizeOrigin(rawOrigin),
    methods: methods,
    allowHeaders: allowHeaders,
    exposeHeaders: options?.exposeHeaders,
    credentials: options?.credentials,
    maxAge: maxAge,
    preflight: {
        statusCode: options?.preflight?.statusCode ?? defaults.preflight.statusCode
    }
  });
};
