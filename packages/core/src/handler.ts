import { RouteSchema, Context, TritioDefs, DefaultTritioDefs } from './types';

/**
 * Creates a handler builder bound to specific Application Definitions.
 * This allows defining handlers without repeatedly specifying global types.
 *
 * Example:
 * const handler = createHandlerBuilder<AppDefs>();
 * export const myHandler = handler(MySchema, (ctx) => { ... });
 */
export const createHandlerBuilder = <Defs extends TritioDefs = DefaultTritioDefs>() => {
  return <S extends RouteSchema>(schema: S, handler: (ctx: Context<S, Defs>) => unknown) => handler;
};
