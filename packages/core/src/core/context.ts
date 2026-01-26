import { getQuery, H3Event } from 'h3';
import { Context, RouteSchema, TritioDefs } from '../types';

export class ContextFactory {
  static create<S extends RouteSchema, Defs extends TritioDefs>(
    event: H3Event,
    rawBody: unknown
  ): Context<S, Defs> {
    let cachedQuery: Record<string, unknown> | undefined;
    let cachedParams: Record<string, unknown> | undefined;

    const ctx: Context<S, Defs> = {
      ...event.context,
      event,
      body: rawBody as Context<S, Defs>['body'],

      json: (data: any, status = 200) => {
        return new Response(JSON.stringify(data), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      },

      text: (text: string, status = 200) => {
        return new Response(text, {
          status,
          headers: { 'Content-Type': 'text/plain' },
        });
      },
    } as Context<S, Defs>;

    // Lazy-loaded query
    Object.defineProperty(ctx, 'query', {
      get() {
        if (!cachedQuery) {
          cachedQuery = getQuery(event);
        }
        return cachedQuery;
      },
      enumerable: true,
      configurable: true,
    });

    // Lazy-loaded params
    Object.defineProperty(ctx, 'params', {
      get() {
        if (!cachedParams) {
          cachedParams = event.context.params || {};
        }
        return cachedParams;
      },
      enumerable: true,
      configurable: true,
    });

    return ctx;
  }

  /**
   * Creates a generic context for error handlers
   */
  static createErrorContext<Defs extends TritioDefs>(
    event: H3Event
  ): import('../types').GenericContext<Defs> {
    return {
      ...event.context,
      event,
      body: null,
      query: getQuery(event),
      params: event.context.params || {},

      json: (data: any, status = 200) => {
        return new Response(JSON.stringify(data), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      },

      text: (text: string, status = 200) => {
        return new Response(text, {
          status,
          headers: { 'Content-Type': 'text/plain' },
        });
      },
    } as import('../types').GenericContext<Defs>;
  }
}
