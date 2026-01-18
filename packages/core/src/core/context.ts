import { getQuery, H3Event } from 'h3';
import { Context, RouteSchema } from '../types';

export type InternalContext<S extends RouteSchema, Env> = Context<S, Env> & {
  _query?: Record<string, unknown>;
  _params?: Record<string, unknown>;
};

export class ContextFactory {
  static create<S extends RouteSchema, Env>(event: H3Event, rawBody: unknown): Context<S, Env> {
    const ctx: InternalContext<S, Env> = {
      ...event.context,
      event,
      body: rawBody as Context<S, Env>['body'],

      get query() {
        if (!this._query) {
          this._query = getQuery(event);
        }
        return this._query as Context<S, Env>['query'];
      },

      get params() {
        if (!this._params) {
          this._params = event.context.params || {};
        }
        return this._params as Context<S, Env>['params'];
      },
    } as InternalContext<S, Env>;

    return ctx;
  }
}
