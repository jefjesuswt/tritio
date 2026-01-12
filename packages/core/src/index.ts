import {Type, type Static, type TSchema} from 'typebox'
import { Compile } from 'typebox/compile'
import { H3, H3Event, serve } from 'h3'

export const t = {
    ...Type,
    Email: (options?: any) => Type.String({format: 'email', ...options}), 
}

export interface RouteSchema {
    body?: TSchema,
    query?: TSchema,
    params?: TSchema,
    response?: TSchema
}

export interface Context<S extends RouteSchema> {
    event: H3Event
    body: S['body'] extends TSchema ? Static<S['body']> : unknown;
    query: S['query'] extends TSchema ? Static<S['query']> : Record<string, string>;
    params: S['params'] extends TSchema ? Static<S['params']> : Record<string, string>
}

export class Tritio {
    private h3: H3;
    
    constructor() {
        this.h3 = new H3({
            onError: (error) => {
                console.error(error)
                return  {error: "Internal server error"}
            },
        })
    }

    private register<S extends RouteSchema>(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        path: string,
        schema: S,
        handler: (ctx: Context<S>) => unknown
    ) {
        const bodyVal = schema?.body ? Compile(schema.body) : null;
        const queryVal = schema?.query ? Compile(schema.query) : null;
        const paramsVal = schema?.params ? Compile(schema.params) : null;
        const needsBodyParsing = method !== 'GET' && !!bodyVal;

        const run = (event: H3Event, rawBody: any) => {
            const ctx: Context<S> = {
                event,
                body: rawBody,
                get query() {
                    // @ts-ignore
                    if (!this._query) {
                         // @ts-ignore
                        this._query = Object.fromEntries(event.url.searchParams.entries());
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
            };

            // Validations
            if (paramsVal && !paramsVal.Check(ctx.params)) {
                event.res.status = 400;
                return {error: "Invalid params", details: [...paramsVal.Errors(ctx.params)]}
            }
            if (queryVal && !queryVal.Check(ctx.query)) {
                event.res.status = 400;
                return {error: "Invalid query", details: [...queryVal.Errors(ctx.query)]}
            }
            if (bodyVal && !bodyVal.Check(ctx.body)) {
                event.res.status = 400;
                return {error: "Invalid body", details: [...bodyVal.Errors(ctx.body)]}
            }

            // Run handler
            return handler(ctx);
        };

        // Conditional registration
        if (needsBodyParsing) {
             // Slow path: use async/await, need to read the body
             this.h3.on(method, path, async (event) => {
                 const rawBody = await event.req.json().catch(() => undefined);
                 return run(event, rawBody);
             });
        } else {
             // Fast path: no async, no await, no extra promises
             this.h3.on(method, path, (event) => {
                 return run(event, undefined);
             });
        }

        return this;
    }

    get<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S>) => any) {
        return this.register('GET', path, schema, handler)
    }

    post<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S>) => any) {
        return this.register('POST', path, schema, handler)
    }

    put<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S>) => any) {
        return this.register('PUT', path, schema, handler)
    }

    delete<S extends RouteSchema>(path: string, schema: S, handler: (c: Context<S>) => any) {
        return this.register('DELETE', path, schema, handler)
    }

    public get fetch() {
        return this.h3.fetch;
    }

    listen(port: number, callback?: () => void) {
        serve(this.h3, {
            port,
        })
        if (callback) callback();
    };
}