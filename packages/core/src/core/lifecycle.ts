import { H3Event, HTTPError as H3Error } from 'h3';
import {
  GlobalHook,
  ErrorHook,
  TransformHook,
  ContextHook,
  ErrorConstructor,
  ErrorHandler,
  TritioDefs,
} from '../types';
import { errorHandler, HTTPError } from '../http';
import { logRequest } from '../logger';
import { ContextFactory } from './context';

export class LifecycleManager<Defs extends TritioDefs> {
  //global
  public onRequestHooks: GlobalHook[] = [];
  public onResponseHooks: Array<(response: any, event: H3Event) => void | Promise<void>> = [];
  public onErrorHooks: ErrorHook[] = [];

  //pipeline
  public onTransformHooks: TransformHook<Defs>[] = [];
  public onBeforeHandleHooks: ContextHook<Defs>[] = [];
  public onAfterHandleHooks: ContextHook<Defs>[] = [];

  // Error handler registry (public for instance merging)
  public errorHandlers: Map<ErrorConstructor<any>, ErrorHandler<any, Defs>> = new Map();

  addRequest(fn: GlobalHook) {
    this.onRequestHooks.push(fn);
  }
  addResponse(fn: (res: any, event: H3Event) => void) {
    this.onResponseHooks.push(fn);
  }
  addError(fn: ErrorHook) {
    this.onErrorHooks.push(fn);
  }

  addTransform(fn: TransformHook<Defs>) {
    this.onTransformHooks.push(fn);
  }
  addBeforeHandle(fn: ContextHook<Defs>) {
    this.onBeforeHandleHooks.push(fn);
  }
  addAfterHandle(fn: ContextHook<Defs>) {
    this.onAfterHandleHooks.push(fn);
  }

  /**
   * Registers a custom error handler for a specific error type
   */
  public addErrorHandler<T extends Error>(
    errorType: ErrorConstructor<T>,
    handler: ErrorHandler<T, Defs>
  ) {
    this.errorHandlers.set(errorType, handler);
  }

  async runOnRequest(event: H3Event) {
    (event.context as any)._start = performance.now();
    for (const hook of this.onRequestHooks) await hook(event);
  }

  async runOnResponse(response: any, event: H3Event) {
    const start = (event.context as any)._start;
    if (start) {
      const duration = Math.round(performance.now() - start);
      const method = event.req.method || 'GET';
      const path = event.url.pathname || '/';
      logRequest(method, path, response.status || 200, duration);
    }
    for (const hook of this.onResponseHooks) await hook(response, event);
  }

  async runOnError(error: HTTPError | H3Error | Error, event: H3Event) {
    // 1. Check for registered custom error handlers
    for (const [ErrorClass, handler] of this.errorHandlers) {
      // Check if the error itself matches
      const isMatch = error instanceof ErrorClass;
      // Also check if the error.cause matches (H3 might wrap our custom errors)
      const isCauseMatch = (error as any).cause instanceof ErrorClass;

      if (isMatch || isCauseMatch) {
        // Use the original error (from cause) if it matches, otherwise use the error itself
        const originalError = isCauseMatch ? (error as any).cause : error;

        // Create generic context for the handler
        const ctx = ContextFactory.createErrorContext<Defs>(event);
        const result = await handler(originalError, ctx);

        // If handler returns a Response, use it directly
        if (result instanceof Response) {
          return result;
        }

        // If handler returns data, wrap in Response
        if (result !== undefined && result !== null) {
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // 2. Run existing error hooks
    for (const hook of this.onErrorHooks) await hook(event, error);

    // 3. Default error handler
    // If error is already HTTPError or H3Error, pass it directly
    // Otherwise wrap generic Error in HTTPError
    if (error instanceof HTTPError || error instanceof H3Error) {
      return errorHandler(error);
    }

    // Wrap generic errors in HTTPError
    return errorHandler(new HTTPError(500, { message: error.message, cause: error }));
  }

  /**
   * Creates a shallow copy of the lifecycle manager
   * Used for scoping apps (guards, groups) to avoid polluting the parent
   */
  clone(): LifecycleManager<Defs> {
    const clone = new LifecycleManager<Defs>();

    // Copy arrays (shallow copy is fine for function references)
    clone.onRequestHooks = [...this.onRequestHooks];
    clone.onResponseHooks = [...this.onResponseHooks];
    clone.onErrorHooks = [...this.onErrorHooks];

    clone.onTransformHooks = [...this.onTransformHooks];
    clone.onBeforeHandleHooks = [...this.onBeforeHandleHooks];
    clone.onAfterHandleHooks = [...this.onAfterHandleHooks];

    // Copy Map
    clone.errorHandlers = new Map(this.errorHandlers);

    return clone;
  }
}
