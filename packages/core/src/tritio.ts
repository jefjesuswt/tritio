import { H3, H3Event, serve, getQuery, readBody } from 'h3'
import { Compile } from 'typebox/compile'
import { type RouteSchema, type Context, type MiddlewareHandler } from './types'
import { errorHandler } from './error/handler'
import { BadRequestException } from './error/http-error'
import { generateOpenApiSpec } from './docs/openapi'
import { generateScalarHtml } from './docs/scalar'
import { type HTTPMethod } from './http/methods'
import { useCors } from './http/cors'

export class Tritio {
    private h3: H3;
    private middlewares: MiddlewareHandler[] = [];

    private routes: Array<{
        method: string;
        path: string;
        schema: RouteSchema;
    }> = [];

    private prefix: string = '';

    constructor(options: { prefix?: string } = {}) {
        this.prefix = options.prefix || '';
        this.h3 = new H3({
            onError: errorHandler,
            onRequest: (event) => {
                // Global CORS handling
                useCors(event);
            }
        })
    }

    public use(handler: MiddlewareHandler) {
        this.middlewares.push(handler);
        return this;
    }

    /**
     * Mounts a sub-application to a specific path prefix.
     * Delegates runtime handling to h3.mount and aggregates route metadata for docs.
     */
    public mount(prefix: string, app: Tritio) {
        // 1. Runtime: Delegate to H3 Native Mount
        // @ts-ignore - H3 type definitions might be missing mount in some versions, but it exists at runtime
        this.h3.mount(prefix, app.h3);

        // 2. Metadata: Aggregate routes for OpenAPI/Docs
        // We iterate over the sub-app routes, prepend the prefix, and add them to our own routes list
        app.routes.forEach(route => {
            // Cleanly join paths: prefix + route.path
            // e.g. /api + /users -> /api/users
            // e.g. /api + / -> /api
            const fullPath = this.joinPaths(prefix, route.path);
            
            this.routes.push({
                ...route,
                path: fullPath
            });
        });

        return this;
    }

    /**
     * Creates a route group with a shared prefix.
     * Uses a temporary sub-app and mounts it.
     */
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
        handler: (ctx: Context<S>) => unknown
    ) {
        // Apply instance prefix if present (e.g. from constructor)
        // If this app is mounted, the parent handles the mount prefix.
        // But if this app has a constructor prefix, we treat it as part of the route's relative path.
        const fullPath = this.prefix ? this.joinPaths(this.prefix, path) : path;

        this.routes.push({ method, path: fullPath, schema });
        const bodyVal = schema?.body ? Compile(schema.body) : null;
        const queryVal = schema?.query ? Compile(schema.query) : null;
        const paramsVal = schema?.params ? Compile(schema.params) : null;
        
        // Only parse body for methods that typically have one
        const needsBodyParsing = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !!bodyVal;

        // Context Creator (Sync & Reusable)
        const createContext = (event: H3Event, rawBody: any): Context<S> => ({
            event,
            body: rawBody,
            get query() {
                // @ts-ignore
                if (!this._query) {
                        // @ts-ignore
                    this._query = getQuery(event);
                }
                // @ts-ignore
                return this._query;
            },
            get params() {
                // @ts-ignore
                if (!this._params) {
                        // @ts-ignore
                    this._params = event.context.params || {};
                }
                // @ts-ignore
                return this._params;
            }
        });

        // Validator (Sync & Reusable)
        const validate = (ctx: Context<S>) => {
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

        // -----------------------------
        // SLOW PATH (Async + Middlewares)
        // -----------------------------
        // -----------------------------
        // SLOW PATH (Async + Middlewares)
        // -----------------------------
        if (needsBodyParsing || this.middlewares.length > 0) {
                this.h3.on(method, fullPath, async (event) => {
                    const rawBody = await readBody(event).catch(() => undefined);
                    const ctx = createContext(event, rawBody);
                    
                    validate(ctx);

                    // Middleware Dispatcher (Onion Model)
                    const dispatch = async (index: number): Promise<any> => {
                        if (index < this.middlewares.length) {
                            const middleware = this.middlewares[index];
                            if (middleware) {
                                return middleware(ctx, () => dispatch(index + 1));
                            }
                        }
                        return handler(ctx);
                    };

                    return dispatch(0);
                });
        } 
        // -----------------
        // FAST PATH (Sync)
        // -----------------
        else {
                this.h3.on(method, fullPath, (event) => {
                    // Create Context (Sync)
                    const ctx = createContext(event, undefined);
                    
                    // Validate (Sync)
                    validate(ctx);
                    
                    // Execute (Sync)
                    return handler(ctx);
                });
        }

        return this;
    }

    // HTTP Methods
    public get<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S>) => any) {
        return this.register('GET', path, schema, handler)
    }

    public post<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S>) => any) {
        return this.register('POST', path, schema, handler)
    }

    public put<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S>) => any) {
        return this.register('PUT', path, schema, handler)
    }

    public delete<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S>) => any) {
        return this.register('DELETE', path, schema, handler)
    }

    public patch<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S>) => any) {
        return this.register('PATCH', path, schema, handler)
    }

    public head<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S>) => any) {
        return this.register('HEAD', path, schema, handler)
    }

    public options<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S>) => any) {
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

    public get fetch() {
        return this.h3.fetch;
    }

    public listen(port: number, callback?: () => void) {
        serve(this.h3, {
            port,
        })
        if (callback) callback();
    };
}
