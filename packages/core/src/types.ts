import { type Static, type TSchema } from 'typebox'
import { H3Event } from 'h3'

export interface TritioOptions {
    prefix?: string;
    cors?: CorsOptions | boolean;
}

export interface RouteSchema {
    body?: TSchema,
    query?: TSchema,
    params?: TSchema,
    response?: TSchema
}

export type AppSchema = {
    [Path: string]: {
        [Method: string]: {
            input: any;
            output: any;
        }
    }
};

export type Context<S extends RouteSchema, Env = {}> = Env & {
    event: H3Event
    body: S['body'] extends TSchema ? Static<S['body']> : unknown;
    query: S['query'] extends TSchema ? Static<S['query']> : Record<string, string>;
    params: S['params'] extends TSchema ? Static<S['params']> : Record<string, string>
}

export interface CorsOptions {
    origin?: string | string[] | ((origin: string) => boolean);
    methods?: string[];
    allowHeaders?: string[];
    exposeHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
    preflight?: {
        statusCode?: number;
    };
}

export type Next = () => Promise<void>;

export type MiddlewareHandler<Env = {}> = (ctx: Context<any, Env>, next: Next) => Promise<void> | void;
