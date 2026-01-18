import { type Static, type TSchema } from 'typebox';
import { H3Event } from 'h3';
import { Tritio } from './tritio';

export interface TritioOptions {
  prefix?: string;
}

export interface RouteSchema {
  body?: TSchema;
  query?: TSchema;
  params?: TSchema;
  response?: TSchema;

  detail?: {
    tags?: string[];
    summary?: string;
    description?: string;
    security?: Record<string, string[]>[];
  };
}

export type Context<S extends RouteSchema = any, Env = Record<string, unknown>> = Env & {
  event: H3Event;
  body: S extends { body: TSchema } ? Static<S['body']> : unknown;
  query: S extends { query: TSchema } ? Static<S['query']> : Record<string, any>;
  params: S extends { params: TSchema } ? Static<S['params']> : Record<string, any>;
};

export type GenericContext<Env = Record<string, unknown>> = Env & {
  event: H3Event;
  body: unknown;
  query: Record<string, unknown>;
  params: Record<string, unknown>;
};

// Lifecycle hooks

export type GlobalHook = (event: H3Event) => void | Promise<void>;
export type ErrorHook = (event: H3Event, error: Error) => any;

export type ContextHook<Env> = (
  ctx: GenericContext<Env>
) => void | Promise<void> | Response | Promise<Response>;

export type TransformHook<Env> = (
  ctx: GenericContext<Env>
) => Record<string, any> | Promise<Record<string, any>>;

export interface LifecycleStore<Env> {
  // global
  onRequest: GlobalHook[];
  onResponse: Array<(Response: any, event: H3Event) => void | Promise<void>>;
  onError: ErrorHook[];

  // pipeline
  onTransform: TransformHook<Env>[];
  onBeforeHandle: ContextHook<Env>[];
  onAfterHandle: ContextHook<Env>[];
}

export type TritioPlugin<In extends Record<string, any> = any, Out = In> = (
  app: Tritio<In>
) => Tritio<Out>;

export type MountedAppType<Env, CurrentSchema, SubSchema, Prefix extends string> = Tritio<
  Env,
  CurrentSchema & {
    [K in keyof SubSchema as string extends K
      ? never
      : K extends string
        ? `${Prefix}${K}`
        : never]: SubSchema[K];
  }
>;
