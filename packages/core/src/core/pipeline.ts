import { EventHandlerResponse, H3Event, readBody } from 'h3';
import { BadRequestException, HTTPMethod } from '../http';
import { Context, RouteSchema, TritioDefs } from '../types';
import { SchemaValidator } from '../validation/compiler';
import { ContextFactory } from './context';
import { LifecycleManager } from './lifecycle';

export class ExecutionPipeline {
  static build<S extends RouteSchema, Defs extends TritioDefs>(
    schema: S,
    lifecycle: LifecycleManager<Defs>,
    handler: (ctx: Context<S, Defs>) => unknown,
    method: HTTPMethod
  ) {
    const validator = new SchemaValidator(schema);

    const needsBodyParsing = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    return async (event: H3Event): Promise<EventHandlerResponse> => {
      let rawBody: unknown = undefined;

      if (needsBodyParsing) {
        try {
          rawBody = await readBody(event);
        } catch (err) {
          if (event.req.headers.get('content-type')?.includes('application/json')) {
            throw new BadRequestException({ message: 'Invalid JSON Body', cause: err });
          }
        }
      }

      const ctx = ContextFactory.create<S, Defs>(event, rawBody);

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
