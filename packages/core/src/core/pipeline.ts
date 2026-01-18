import { EventHandlerResponse, H3Event, readBody } from 'h3';
import { HTTPMethod } from '../http';
import { Context, RouteSchema } from '../types';
import { SchemaValidator } from '../validation/compiler';
import { ContextFactory } from './context';
import { LifecycleManager } from './lifecycle';

export class ExecutionPipeline {
  static build<S extends RouteSchema, Env>(
    schema: S,
    lifecycle: LifecycleManager<Env>,
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

      for (const hook of lifecycle.onTransformHooks) {
        const derived = await hook(ctx as any);
        if (derived) {
          Object.assign(ctx, derived);
          Object.assign(ctx.event.context, derived);
        }
      }

      validator.validate(ctx);

      for (const hook of lifecycle.onBeforeHandleHooks) {
        const result = await hook(ctx as any);
        if (result) return result;
      }

      const response = await handler(ctx);

      for (const hook of lifecycle.onAfterHandleHooks) {
        await hook(ctx as any);
      }

      return response;
    };
  }
}
