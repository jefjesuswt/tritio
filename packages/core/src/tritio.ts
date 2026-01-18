import { H3, serve } from 'h3';
import {
  type RouteSchema,
  type Context,
  type TritioOptions,
  ContextHook,
  GlobalHook,
  GenericContext,
  MountedAppType,
} from './types';
import { type HTTPMethod } from './http/methods';
import { Static, TSchema } from 'typebox';
import { ExecutionPipeline } from './core/pipeline';
import { printRoutes, printStartup } from './logger';
import { LifecycleManager } from './core/lifecycle';
import { RouteRegistry } from './core/registry';

export class Tritio<Env = Record<string, unknown>, Schema = {}> {
  public readonly _schema!: Schema;

  public h3: H3;
  public lifecycle: LifecycleManager<Env>;

  private registry: RouteRegistry;
  private prefix: string;

  constructor(options: TritioOptions = {}) {
    this.prefix = options.prefix || '';
    this.lifecycle = new LifecycleManager<Env>();
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

  public use<NewEnv = Env>(
    plugin: (app: Tritio<Env, Schema>) => Tritio<NewEnv, Schema>
  ): Tritio<NewEnv, Schema> {
    plugin(this);
    return this as unknown as Tritio<NewEnv, Schema>;
  }

  public derive<Derived extends Record<string, any>>(
    fn: (ctx: GenericContext<Env>) => Derived | Promise<Derived>
  ): Tritio<Env & Derived, Schema> {
    this.lifecycle.addTransform(fn);
    return this as unknown as Tritio<Env & Derived, Schema>;
  }

  public onBeforeHandle(fn: ContextHook<Env>) {
    this.lifecycle.addBeforeHandle(fn);
    return this;
  }

  public onAfterHandle(fn: ContextHook<Env>) {
    this.lifecycle.addAfterHandle(fn);
    return this;
  }

  public onRequest(fn: GlobalHook) {
    this.lifecycle.addRequest(fn);
    return this;
  }

  // HTTP Methods
  public get<P extends string, S extends RouteSchema>(
    path: P,
    schema: S,
    h: (c: Context<S, Env>) => unknown
  ) {
    return this.register('GET', path, schema, h);
  }
  public post<P extends string, S extends RouteSchema>(
    path: P,
    schema: S,
    h: (c: Context<S, Env>) => unknown
  ) {
    return this.register('POST', path, schema, h);
  }
  public put<P extends string, S extends RouteSchema>(
    path: P,
    schema: S,
    h: (c: Context<S, Env>) => unknown
  ) {
    return this.register('PUT', path, schema, h);
  }
  public delete<P extends string, S extends RouteSchema>(
    path: P,
    schema: S,
    h: (c: Context<S, Env>) => unknown
  ) {
    return this.register('DELETE', path, schema, h);
  }
  public patch<P extends string, S extends RouteSchema>(
    path: P,
    schema: S,
    h: (c: Context<S, Env>) => unknown
  ) {
    return this.register('PATCH', path, schema, h);
  }
  public head<P extends string, S extends RouteSchema>(
    path: P,
    schema: S,
    h: (c: Context<S, Env>) => unknown
  ) {
    return this.register('HEAD', path, schema, h);
  }
  public options<P extends string, S extends RouteSchema>(
    path: P,
    schema: S,
    h: (c: Context<S, Env>) => unknown
  ) {
    return this.register('OPTIONS', path, schema, h);
  }

  private register<S extends RouteSchema, Path extends string, Method extends HTTPMethod>(
    method: Method,
    path: Path,
    schema: S,
    handler: (ctx: Context<S, Env>) => unknown
  ) {
    const fullPath = this.joinPaths(this.prefix, path);
    this.registry.add(method, fullPath, schema);

    const h3Handler = ExecutionPipeline.build(schema, this.lifecycle, handler, method);
    this.h3.on(method, fullPath, h3Handler);

    return this as unknown as Tritio<
      Env,
      Schema & {
        [K in Path]: {
          [M in Lowercase<Method>]: {
            input: S['body'] extends TSchema ? Static<S['body']> : undefined;
            output: S['response'] extends TSchema ? Static<S['response']> : unknown;
          };
        };
      }
    >;
  }

  public mount<P extends string, SubSchema>(
    prefix: P,
    app: Tritio<any, SubSchema>
  ): MountedAppType<Env, Schema, SubSchema, P> {
    this.h3.mount(prefix, app.h3);

    app.routes.forEach((route) => {
      const fullPath = this.joinPaths(prefix, route.path);
      this.registry.add(route.method, fullPath, route.schema);
    });

    return this as unknown as MountedAppType<Env, Schema, SubSchema, P>;
  }

  public group(prefix: string, callback: (app: Tritio<Env>) => void) {
    const subApp = new Tritio<Env>();
    callback(subApp);
    this.mount(prefix, subApp);
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
