import { H3, H3Event, serve, getQuery, readBody } from 'h3'
import { Compile } from 'typebox/compile'
import { type RouteSchema, type Context, type MiddlewareHandler, type TritioOptions } from './types'
import { errorHandler } from './error/handler'
import { BadRequestException } from './error/http-error'
import { generateOpenApiSpec } from './docs/openapi'
import { generateScalarHtml } from './docs/scalar'
import { type HTTPMethod } from './http/methods'
import { useCors } from './http/cors'

export class Tritio<Env = {}> {
    private h3: H3;
    private middlewares: MiddlewareHandler<Env>[] = [];

    private routes: Array<{
        method: string;
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
          }
        })
    }

    public use(handler: MiddlewareHandler<Env>) {
        this.middlewares.push(handler);
        return this;
    }

    public derive<NewContext>(
        fn: (ctx: Context<any, Env>) => NewContext | Promise<NewContext>
    ): Tritio<Env & NewContext> {
        this.use(async (ctx, next) => {
            const derived = await fn(ctx);
            Object.assign(ctx, derived);
            Object.assign(ctx.event.context, derived);
            await next();
        });

        return this as unknown as Tritio<Env & NewContext>;
    }

    public request(path: string, options: RequestInit = {}): Promise<Response> {
        const url = path.startsWith('http') ? path : `http://localhost:3000/${path}`
        const req = new Request(url, options)

        return this.fetch(req);
    }

    public mount(prefix: string, app: Tritio) {
        this.h3.mount(prefix, app.h3);

        app.routes.forEach(route => {

            const fullPath = this.joinPaths(prefix, route.path);

            this.routes.push({
                ...route,
                path: fullPath
            });
        });

        return this;
    }

    public group(prefix: string, callback: (app: Tritio) => void) {
        const subApp = new Tritio();
        callback(subApp);
        this.mount(prefix, subApp);
        return this;
    }

    private joinPaths(...segments: string[]) {
        return '/' + segments
          .join('/')
          .split('/')
          .filter(Boolean)
          .join('/');
    }

    private register<S extends RouteSchema>(
        method: HTTPMethod,
        path: string,
        schema: S,
        handler: (ctx: Context<S, Env>) => unknown
    ) {
        const fullPath = this.prefix ? this.joinPaths(this.prefix, path) : path;

        this.routes.push({ method, path: fullPath, schema });
        const bodyVal = schema?.body ? Compile(schema.body) : null;
        const queryVal = schema?.query ? Compile(schema.query) : null;
        const paramsVal = schema?.params ? Compile(schema.params) : null;

        const needsBodyParsing = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !!bodyVal;

        const createContext = (event: H3Event, rawBody: any): Context<S, Env> => {

            const ctx: any = {
                event,
                body: rawBody,
                get query() {
                    if (!this._query) {
                        this._query = getQuery(event);
                    }
                    return this._query;
                },
                get params() {
                    if (!this._params) {
                        this._params = event.context.params || {};
                    }
                    return this._params;
                }
            }
            Object.assign(ctx, event.context);
            return ctx;
        };

        // Validator (Sync & Reusable)
        const validate = (ctx: Context<S, Env>) => {
            if (paramsVal && !paramsVal.Check(ctx.params)) {
                throw new BadRequestException({ message: "Invalid params", cause: [...paramsVal.Errors(ctx.params)] });
            }
            if (queryVal && !queryVal.Check(ctx.query)) {
                throw new BadRequestException({ message: "Invalid query", cause: [...queryVal.Errors(ctx.query)] });
            }
            if (bodyVal && !bodyVal.Check(ctx.body)) {
                throw new BadRequestException({ message: "Invalid body", cause: [...bodyVal.Errors(ctx.body)] });
            }
        };


        if (needsBodyParsing || this.middlewares.length > 0) {
            this.h3.on(method, fullPath, async (event) => {
                const rawBody = await readBody(event).catch(() => undefined);
                const ctx = createContext(event, rawBody)
                
                validate(ctx)
                const dispatch = async (index: number): Promise<any> => {
                    if (index < this.middlewares.length) {
                        const middleware = this.middlewares[index];
                        return middleware(ctx, () => dispatch(index + 1));
                    }
                    return handler(ctx);
                }
                return dispatch(0);
            });
        } else {
            this.h3.on(method, fullPath, (event) => {
                const ctx = createContext(event, undefined);
                validate(ctx);
                return handler(ctx);
            });
        }


        return this;
    }

    // HTTP Methods
    public get<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S, Env>) => any) {
        return this.register('GET', path, schema, handler)
    }

    public post<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S, Env>) => any) {
        return this.register('POST', path, schema, handler)
    }

    public put<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S, Env>) => any) {
        return this.register('PUT', path, schema, handler)
    }

    public delete<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S, Env>) => any) {
        return this.register('DELETE', path, schema, handler)
    }

    public patch<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S, Env>) => any) {
        return this.register('PATCH', path, schema, handler)
    }

    public head<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S, Env>) => any) {
        return this.register('HEAD', path, schema, handler)
    }

    public options<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S, Env>) => any) {
        return this.register('OPTIONS', path, schema, handler)
    }

    public docs(path: string = '/docs') {
            // 1. Endpoint for pure JSON (OpenAPI Spec)
            this.h3.on('GET', `${path}/json`, () => {
                return generateOpenApiSpec(this.routes);
            });

            // 2. Endpoint for HTML (Scalar UI)
            this.h3.on('GET', path, () => {
                const specUrl = `${path}/json`;
                const html = generateScalarHtml(specUrl);
                return new Response(html, {
                    headers: { 'Content-Type': 'text/html' }
                });
            });
    }

    public get fetch(): (request: Request | string, init?: RequestInit) => Promise<Response> {
            // @ts-ignore - H3 fetch es compatible, pero a veces los tipos de RequestInit de Node vs Web chocan
            return this.h3.fetch;
        }
    public listen(port: number, callback?: () => void) {
        serve(this.h3, {
            port,
        })
        if (callback) callback();
    };
}
