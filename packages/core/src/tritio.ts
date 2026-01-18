import { H3, serve } from 'h3';
import {
  type RouteSchema,
  type Context,
  type MiddlewareHandler,
  type TritioOptions,
} from './types';
import { generateOpenApiSpec } from './docs/openapi';
import { generateScalarHtml } from './docs/scalar';
import { type HTTPMethod } from './http/methods';
import { useCors } from './http/cors';
import { Static, TSchema } from 'typebox';
import { errorHandler } from './http/errors';
import { ExecutionPipeline } from './core/pipeline';

export class Tritio<Env = Record<string, unknown>, Schema = {}> {
  public readonly _schema!: Schema;
  private h3: H3;
  private middlewares: MiddlewareHandler<Env>[] = [];

  private routes: Array<{
    method: HTTPMethod;
    path: string;
    schema: RouteSchema;
  }> = [];

  private prefix: string = '';

  constructor(options: TritioOptions = {}) {
    this.prefix = options.prefix || '';
    this.h3 = new H3({
      onError: errorHandler,
      onRequest: (event) => {
        if (options.cors === false) return;
        const corsConfig = typeof options.cors === 'object' ? options.cors : undefined;
        useCors(event, corsConfig);
      },
    });
  }

  public use(handler: MiddlewareHandler<Env>) {
    this.middlewares.push(handler);
    return this;
  }

  public derive<NewContext>(
    fn: (ctx: Context<RouteSchema, Env>) => NewContext | Promise<NewContext>
  ): Tritio<Env & NewContext, Schema> {
    this.use(async (ctx, next) => {
      const derived = await fn(ctx as Context<RouteSchema, Env>);
      Object.assign(ctx, derived);
      Object.assign(ctx.event.context, derived);
      await next();
    });

    return this as unknown as Tritio<Env & NewContext, Schema>;
  }

  private register<S extends RouteSchema, Path extends string, Method extends HTTPMethod>(
    method: Method,
    path: Path,
    schema: S,
    handler: (ctx: Context<S, Env>) => unknown
  ): Tritio<
    Env,
    Schema & {
      [K in Path]: {
        [M in Lowercase<Method>]: {
          input: S['body'] extends TSchema ? Static<S['body']> : undefined;
          output: S['response'] extends TSchema ? Static<S['response']> : unknown;
        };
      };
    }
  > {
    const fullPath = this.prefix ? this.joinPaths(this.prefix, path) : path;

    this.routes.push({ method, path: fullPath, schema });

    const h3Handler = ExecutionPipeline.build(schema, this.middlewares, handler, method);

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

  // HTTP Methods
  public get<Path extends string, S extends RouteSchema>(
    path: Path,
    schema: S,
    handler: (c: Context<S, Env>) => unknown
  ) {
    return this.register('GET', path, schema, handler);
  }

  public post<Path extends string, S extends RouteSchema>(
    path: Path,
    schema: S,
    handler: (c: Context<S, Env>) => unknown
  ) {
    return this.register('POST', path, schema, handler);
  }

  public put<Path extends string, S extends RouteSchema>(
    path: Path,
    schema: S,
    handler: (c: Context<S, Env>) => unknown
  ) {
    return this.register('PUT', path, schema, handler);
  }

  public delete<Path extends string, S extends RouteSchema>(
    path: Path,
    schema: S,
    handler: (c: Context<S, Env>) => unknown
  ) {
    return this.register('DELETE', path, schema, handler);
  }

  public patch<Path extends string, S extends RouteSchema>(
    path: Path,
    schema: S,
    handler: (c: Context<S, Env>) => unknown
  ) {
    return this.register('PATCH', path, schema, handler);
  }

  public head<Path extends string, S extends RouteSchema>(
    path: Path,
    schema: S,
    handler: (c: Context<S, Env>) => unknown
  ) {
    return this.register('HEAD', path, schema, handler);
  }

  public options<Path extends string, S extends RouteSchema>(
    path: Path,
    schema: S,
    handler: (c: Context<S, Env>) => unknown
  ) {
    return this.register('OPTIONS', path, schema, handler);
  }

  public docs(path: string = '/docs') {
    this.h3.on('GET', `${path}/json`, () => generateOpenApiSpec(this.routes));
    this.h3.on('GET', path, () => {
      const html = generateScalarHtml(`${path}/json`);
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    });
  }

  public mount<P extends string, SubSchema>(
    prefix: P,
    app: Tritio<any, SubSchema>
  ): Tritio<
    Env,
    Schema & {
      [K in keyof SubSchema as string extends K
        ? never
        : K extends string
          ? `${P}${K}`
          : never]: SubSchema[K];
    }
  > {
    this.h3.mount(prefix, app.h3);

    app.routes.forEach((route) => {
      const fullPath = this.joinPaths(prefix, route.path);
      this.routes.push({
        ...route,
        path: fullPath,
      });
    });

    return this as any;
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
    serve(this.h3, {
      port,
    });
    if (callback) callback();
  }
}
