import { EventHandlerResponse, H3Event, readBody } from 'h3';
import { HTTPMethod } from '../http';
import { Context, MiddlewareHandler, RouteSchema } from '../types';
import { SchemaValidator } from '../validation/compiler';
import { ContextFactory } from './context';

export class ExecutionPipeline {
  static build<S extends RouteSchema, Env>(
    schema: S,
    middlewares: MiddlewareHandler<Env>[],
    handler: (ctx: Context<S, Env>) => unknown,
    method: HTTPMethod
  ) {
    const validator = new SchemaValidator(schema);

    const needsBodyParsing =
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && (validator.hasBodyValidator() || true);

    return async (event: H3Event): Promise<EventHandlerResponse> => {
      let rawBody: unknown = undefined;

      if (needsBodyParsing) {
        rawBody = await readBody(event).catch(() => undefined);
      }

      const ctx = ContextFactory.create<S, Env>(event, rawBody);

      validator.validate(ctx);

      const dispatch = async (index: number): Promise<unknown> => {
        if (index < middlewares.length) {
          const middleware = middlewares[index];

          if (middleware) {
            let nextResult: unknown;
            await middleware(ctx, async () => {
              nextResult = await dispatch(index + 1);
            });
            return nextResult;
          }
        }
        return handler(ctx);
      };
      return dispatch(0);
    };
  }
}
