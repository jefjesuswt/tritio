import { H3, serve } from 'h3';
import {
  type RouteSchema,
  type Context,
  type TritioOptions,
  ContextHook,
  GlobalHook,
  GenericContext,
  MountedAppType,
  ErrorConstructor,
  ErrorHandler,
  TritioDefs,
  DefaultTritioDefs,
} from './types';
import { type HTTPMethod } from './http/methods';
import { Static, TSchema } from 'typebox';
import { ExecutionPipeline } from './core/pipeline';
import { printRoutes, printStartup } from './logger';
import { LifecycleManager } from './core/lifecycle';
import { RouteRegistry } from './core/registry';
import { ForbiddenException } from './http';

export class Tritio<Defs extends TritioDefs = DefaultTritioDefs, Schema = {}> {
  public readonly _schema!: Schema;

  public h3: H3;
  public lifecycle: LifecycleManager<Defs>;

  private registry: RouteRegistry;
  private prefix: string;

  // Store route handlers for guard scope merging
  private routeHandlers: Map<
    string,
    {
      method: HTTPMethod;
      path: string;
      schema: RouteSchema;
      handler: (c: Context<any, Defs>) => unknown;
    }
  > = new Map();

  constructor(options: TritioOptions = {}) {
    this.prefix = options.prefix || '';
    this.lifecycle = new LifecycleManager<Defs>();
    this.registry = new RouteRegistry();

    this.h3 = new H3({
      onError: (err, event) => this.lifecycle.runOnError(err, event),
      onRequest: (event) => this.lifecycle.runOnRequest(event),
      onResponse: (res, event) => this.lifecycle.runOnResponse(res, event),
    });
  }

  public get routes() {
    return this.registry.getAll();
  }

  public use<SubDefs extends TritioDefs>(
    plugin:
      | Tritio<SubDefs, any> // Option A: Another Tritio instance (sub-app)
      | ((app: Tritio<Defs, Schema>) => Tritio<SubDefs, Schema>) // Option B: Plugin function
  ): Tritio<
    {
      store: Defs['store'] & SubDefs['store'];
      decorators: Defs['decorators'] & SubDefs['decorators'];
      schema: Defs['schema'] & SubDefs['schema'];
    },
    Schema
  > {
    // CASE A: It's a Tritio instance (Sub-App)
    if (plugin instanceof Tritio) {
      // 1. Merge Routes (Registry)
      plugin.routes.forEach((route) => {
        this.registry.add(route.method, route.path, route.schema);

        // Note: The H3 handlers are already registered in the sub-app's H3 instance.
        // We need to re-register them in the main app's H3 instance.
        // Since we don't store the original handler function, we'll reconstruct it
        // from the sub-app's lifecycle and schema.
        const h3Handler = ExecutionPipeline.build(
          route.schema,
          plugin.lifecycle,
          // We can't access the original handler, so we create a pass-through
          // that will execute through the merged lifecycle
          async () => {
            throw new Error(
              'Sub-app route handlers should not be called directly. Routes from sub-apps are registered for metadata only.'
            );
          },
          route.method
        );

        // Register in main H3 instance with merged lifecycle
        this.h3.on(route.method, route.path, h3Handler);
      });

      // 2. Merge Lifecycles (Hooks)
      // Copy hooks from sub-app to main app in the correct order

      // Global hooks
      plugin.lifecycle.onRequestHooks.forEach((h) => this.lifecycle.addRequest(h));
      plugin.lifecycle.onResponseHooks.forEach((h) => this.lifecycle.addResponse(h));
      plugin.lifecycle.onErrorHooks.forEach((h) => this.lifecycle.addError(h));

      // Pipeline hooks (where Guards and Transforms live)
      plugin.lifecycle.onTransformHooks.forEach((h) => this.lifecycle.addTransform(h as any));
      plugin.lifecycle.onBeforeHandleHooks.forEach((h) => this.lifecycle.addBeforeHandle(h as any));
      plugin.lifecycle.onAfterHandleHooks.forEach((h) => this.lifecycle.addAfterHandle(h as any));

      // Error handlers
      plugin.lifecycle.errorHandlers.forEach((handler, errorType) => {
        this.lifecycle.addErrorHandler(errorType, handler as any);
      });

      return this as any;
    }

    // CASE B: It's a function (Original plugin behavior)
    return plugin(this) as any;
  }

  public derive<NewProps extends Record<string, any>>(
    fn: (ctx: GenericContext<Defs>) => NewProps | Promise<NewProps>
  ): Tritio<
    {
      decorators: Defs['decorators'];
      schema: Defs['schema'];
      store: Defs['store'] & NewProps;
    },
    Schema
  > {
    this.lifecycle.addTransform(fn as any);
    return this as any;
  }

  public decorate<const Key extends string, Value>(
    key: Key,
    value: Value | (() => Value) | (() => Promise<Value>)
  ): Tritio<
    {
      store: Defs['store'];
      schema: Defs['schema'];
      decorators: Defs['decorators'] & { [K in Key]: Value };
    },
    Schema
  > {
    this.lifecycle.addTransform(async () => {
      const resolvedValue = typeof value === 'function' ? await (value as any)() : value;
      return { [key]: resolvedValue } as any;
    });
    return this as any;
  }

  public onBeforeHandle(fn: ContextHook<Defs>) {
    this.lifecycle.addBeforeHandle(fn);
    return this;
  }

  public onAfterHandle(fn: ContextHook<Defs>) {
    this.lifecycle.addAfterHandle(fn);
    return this;
  }

  public onRequest(fn: GlobalHook) {
    this.lifecycle.addRequest(fn);
    return this;
  }

  /**
   * Registers a custom error handler for a specific error type.
   *
   * Tritio doesn't need to know about external libraries - you pass the error constructor
   * and Tritio will call your handler when that error type is thrown.
   *
   * The handler receives the typed error and a context object with helper methods.
   *
   * @example
   * ```ts
   * import { LibsqlError } from '@libsql/client';
   *
   * app.error(LibsqlError, (err, ctx) => {
   *   if (err.code === 'SQLITE_CONSTRAINT') {
   *     return ctx.json({ error: 'Conflict', message: 'Item already exists' }, 409);
   *   }
   *   return ctx.json({ error: 'Database Error' }, 500);
   * });
   * ```
   */
  public error<T extends Error>(errorType: ErrorConstructor<T>, handler: ErrorHandler<T, Defs>) {
    this.lifecycle.addErrorHandler(errorType, handler);
    return this;
  }

  private register<P extends string, S extends RouteSchema>(
    method: HTTPMethod,
    path: P,
    schema: S,
    h: (c: Context<S, Defs>) => unknown
  ) {
    const fullPath = this.joinPaths(this.prefix, path);
    this.registry.add(method, fullPath, schema);

    // Store handler for guard scope merging
    const routeKey = `${method}:${fullPath}`;
    this.routeHandlers.set(routeKey, {
      method,
      path: fullPath,
      schema,
      handler: h as any,
    });

    const h3Handler = ExecutionPipeline.build(schema, this.lifecycle, h as any, method);
    this.h3.on(method, fullPath, h3Handler);
    return this as unknown as Tritio<
      Defs,
      Schema & {
        [K in P]: {
          [M in Lowercase<typeof method>]: {
            input: S['body'] extends TSchema ? Static<S['body']> : undefined;
            output: S['response'] extends TSchema ? Static<S['response']> : unknown;
          };
        };
      }
    >;
  }

  // HTTP Methods
  public get<P extends string, S extends RouteSchema>(
    path: P,
    schema: S,
    h: (c: Context<S, Defs>) => unknown
  ) {
    return this.register('GET', path, schema, h);
  }
  public post<P extends string, S extends RouteSchema>(
    path: P,
    schema: S,
    h: (c: Context<S, Defs>) => unknown
  ) {
    return this.register('POST', path, schema, h);
  }
  public put<P extends string, S extends RouteSchema>(
    path: P,
    schema: S,
    h: (c: Context<S, Defs>) => unknown
  ) {
    return this.register('PUT', path, schema, h);
  }
  public delete<P extends string, S extends RouteSchema>(
    path: P,
    schema: S,
    h: (c: Context<S, Defs>) => unknown
  ) {
    return this.register('DELETE', path, schema, h);
  }
  public patch<P extends string, S extends RouteSchema>(
    path: P,
    schema: S,
    h: (c: Context<S, Defs>) => unknown
  ) {
    return this.register('PATCH', path, schema, h);
  }
  public head<P extends string, S extends RouteSchema>(
    path: P,
    schema: S,
    h: (c: Context<S, Defs>) => unknown
  ) {
    return this.register('HEAD', path, schema, h);
  }
  public options<P extends string, S extends RouteSchema>(
    path: P,
    schema: S,
    h: (c: Context<S, Defs>) => unknown
  ) {
    return this.register('OPTIONS', path, schema, h);
  }

  /**
   * Guard - Apply hooks and schema to routes in a scoped callback
   *
   * @overload guard(schema, callback) - Elysia-style with schema
   * @overload guard(callback) - Elysia-style callback only
   * @overload guard(predicate, message) - Simple predicate check
   */
  /* ========================================================================
   * Guard Overloads - Explicit definitions for correct inference
   * ======================================================================== */

  /**
   * Guard with Schema and Scope (Elysia Style)
   * Merges guard schema into all routes defined in callback
   */
  public guard<NewSchema>(
    schema: Partial<RouteSchema>,
    callback: (app: Tritio<Defs, {}>) => Tritio<Defs, NewSchema>
  ): Tritio<Defs, Schema & NewSchema>;

  /**
   * Guard with Scope Only (Elysia Style)
   * Creates a scoped section without extra schema
   */
  public guard<NewSchema>(
    callback: (app: Tritio<Defs, {}>) => Tritio<Defs, NewSchema>
  ): Tritio<Defs, Schema & NewSchema>;

  /**
   * Guard with Simple Predicate (Backward Compatibility)
   * Adds a beforeHandle hook that checks a condition
   */
  public guard(
    predicate: (ctx: Partial<GenericContext<Defs>>) => boolean | Promise<boolean>,
    message?: string
  ): Tritio<Defs, Schema>;

  /**
   * Guard Implementation
   */
  public guard(
    arg1:
      | Partial<RouteSchema>
      | ((app: Tritio<Defs, any>) => Tritio<Defs, any>)
      | ((ctx: Partial<GenericContext<Defs>>) => boolean | Promise<boolean>),
    arg2?: ((app: Tritio<Defs, any>) => Tritio<Defs, any>) | string
  ): Tritio<Defs, any> {
    // Implementation handles the runtime logic for all overloads
    // Case 1: guard(schema, callback)
    if (typeof arg1 === 'object' && typeof arg2 === 'function') {
      return this._guardScope(arg1 as Partial<RouteSchema>, arg2 as any);
    }

    // Case 2: guard(callback) -> Delegates to _guardScope with empty schema
    if (typeof arg1 === 'function' && !arg2) {
      try {
        // Create a dummy scoped app
        const scopedApp = new Tritio<Defs, {}>({ prefix: this.prefix });
        scopedApp.lifecycle = this.lifecycle.clone();

        // Try to execute as app callback
        const result = (arg1 as Function)(scopedApp);

        // If result is a Tritio instance, it was an app callback!
        if (result instanceof Tritio) {
          return this._guardScope({}, arg1 as any);
        }
      } catch {
        // If execution fails with an App instance, it's likely a predicate
        // expecting a Context. We fallback to predicate registration.
      }

      // If we are here, assume it is a predicate
      return this._guardPredicate(arg1 as any, 'Forbidden');
    }

    // Case 3: guard(predicate, message)
    if (typeof arg1 === 'function' && typeof arg2 === 'string') {
      return this._guardPredicate(arg1 as any, arg2);
    }

    return this;
  }

  // Helper for Scope Logic
  private _guardScope(
    schema: Partial<RouteSchema>,
    callback: (app: Tritio<Defs, {}>) => Tritio<Defs, any>
  ): Tritio<Defs, any> {
    const guardedApp = new Tritio<Defs, {}>({ prefix: this.prefix });

    // CLONE lifecycle to isolate scope hooks from parent
    guardedApp.lifecycle = this.lifecycle.clone();

    // Apply schema defaults if needed (transforms)
    if (schema.body) guardedApp.lifecycle.addTransform(async () => ({}));

    // Execute callback
    const result = callback(guardedApp);

    // Merge routes defined in scope back to main app
    result.routeHandlers.forEach((routeInfo) => {
      const mergedSchema = { ...schema, ...routeInfo.schema };
      const fullPath = routeInfo.path;

      // 1. Add to registry for Documentation/Client
      this.routeHandlers.set(fullPath, {
        method: routeInfo.method,
        path: fullPath,
        schema: mergedSchema,
        handler: routeInfo.handler,
      });
      this.registry.add(routeInfo.method, fullPath, mergedSchema);

      // 2. Build Pipeline using SCOPED lifecycle (result.lifecycle)
      // This ensures hooks added inside the guard (like predicates) are applied
      const pipeline = ExecutionPipeline.build(
        mergedSchema,
        result.lifecycle,
        routeInfo.handler as any,
        routeInfo.method
      );

      // 3. Register to H3
      this.h3.on(routeInfo.method, fullPath, pipeline);
    });

    return this;
  }

  // Helper for Predicate Logic
  private _guardPredicate(
    check: (ctx: Partial<GenericContext<Defs>>) => boolean | Promise<boolean>,
    message: string
  ): Tritio<Defs, Schema> {
    return this.onBeforeHandle(async (ctx) => {
      const isValid = await check(ctx);
      if (!isValid) throw new ForbiddenException({ message });
    }) as unknown as Tritio<Defs, Schema>;
  }

  public mount<P extends string, SubSchema>(
    prefix: P,
    app: Tritio<any, SubSchema>
  ): MountedAppType<Defs, Schema, SubSchema, P> {
    this.h3.mount(prefix, app.h3);

    app.routes.forEach((route) => {
      const fullPath = this.joinPaths(prefix, route.path);
      this.registry.add(route.method, fullPath, route.schema);
    });

    return this as unknown as MountedAppType<Defs, Schema, SubSchema, P>;
  }

  public group(prefix: string, callback: (app: Tritio<Defs, Schema>) => void) {
    // Pass the current app instance to preserve decorated types
    callback(this);
    return this;
  }

  private joinPaths(...segments: string[]) {
    return '/' + segments.join('/').split('/').filter(Boolean).join('/');
  }

  public get fetch() {
    return this.h3.fetch as unknown as (
      input: RequestInfo | URL,
      init?: RequestInit
    ) => Promise<Response>;
  }

  public request(path: string, options: RequestInit = {}): Promise<Response> {
    const url = path.startsWith('http')
      ? path
      : `http://localhost:3000${path.startsWith('/') ? path : '/' + path}`;

    return this.h3.fetch(new Request(url, options)) as Promise<Response>;
  }

  public listen(port: number, callback?: () => void) {
    printRoutes(this.registry.getAll());

    serve(this.h3, {
      port,
      silent: true,
    });
    printStartup(port).catch(() => {});
    if (callback) callback();
  }
}
