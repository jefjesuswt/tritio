import { type Static, type TSchema } from 'typebox';
import { H3Event } from 'h3';
import { Tritio } from './tritio';

export interface TritioOptions {
  prefix?: string;
}

export interface TritioApp {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
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

// ============================================
// TritioDefs - Type Accumulation Structure
// ============================================

/**
 * Structure that accumulates all types inferred through the chain
 */
export interface TritioDefs {
  store: Record<string, any>; // Variables from .derive()
  decorators: Record<string, any>; // Functions/values from .decorate()
  schema: Record<string, any>; // Route schema accumulation
}

/**
 * The initial state (empty definitions)
 */
export interface DefaultTritioDefs extends TritioDefs {
  store: {};
  decorators: {};
  schema: {};
}

// ============================================
// Context Types - Computed from TritioDefs
// ============================================

/**
 * Context type computed from TritioDefs
 */
export type Context<
  S extends RouteSchema = any,
  Defs extends TritioDefs = DefaultTritioDefs,
> = Defs['store'] &
  Defs['decorators'] & {
    event: H3Event;
    body: S extends { body: TSchema } ? Static<S['body']> : unknown;
    query: S extends { query: TSchema } ? Static<S['query']> : Record<string, any>;
    params: S extends { params: TSchema } ? Static<S['params']> : Record<string, any>;

    // Helper methods for responses
    json: (data: any, status?: number) => Response;
    text: (text: string, status?: number) => Response;
  };

/**
 * Generic context for hooks and error handlers
 */
export type GenericContext<Defs extends TritioDefs = DefaultTritioDefs> = Defs['store'] &
  Defs['decorators'] & {
    event: H3Event;
    body: unknown;
    query: Record<string, unknown>;
    params: Record<string, unknown>;

    // Helper methods for responses
    json: (data: any, status?: number) => Response;
    text: (text: string, status?: number) => Response;
  };

// ============================================
// Error Handling Types
// ============================================

/**
 * Constructor type for error classes
 */
export type ErrorConstructor<T extends Error> = new (...args: any[]) => T;

/**
 * Handler function type - receives typed error and context
 */
export type ErrorHandler<T extends Error, Defs extends TritioDefs> = (
  error: T,
  ctx: GenericContext<Defs>
) => unknown | Promise<unknown>;

// ============================================
// Lifecycle Hook Types
// ============================================

export type GlobalHook = (event: H3Event) => void | Promise<void>;
export type ErrorHook = (event: H3Event, error: Error) => any;

export type ContextHook<Defs extends TritioDefs> = (
  ctx: GenericContext<Defs>
) => void | Promise<void> | Response | Promise<Response>;

export type TransformHook<Defs extends TritioDefs> = (
  ctx: GenericContext<Defs>
) => Record<string, any> | Promise<Record<string, any>>;

export interface LifecycleStore<Defs extends TritioDefs> {
  // global
  onRequest: GlobalHook[];
  onResponse: Array<(Response: any, event: H3Event) => void | Promise<void>>;
  onError: ErrorHook[];

  // pipeline
  onTransform: TransformHook<Defs>[];
  onBeforeHandle: ContextHook<Defs>[];
  onAfterHandle: ContextHook<Defs>[];
}

// ============================================
// Plugin and Mounting Types
// ============================================

export type TritioPlugin<
  InDefs extends TritioDefs = DefaultTritioDefs,
  OutDefs extends TritioDefs = InDefs,
> = (app: Tritio<InDefs>) => Tritio<OutDefs>;

export type MountedAppType<
  Defs extends TritioDefs,
  CurrentSchema,
  SubSchema,
  Prefix extends string,
> = Tritio<
  Defs,
  CurrentSchema & {
    [K in keyof SubSchema as string extends K
      ? never
      : K extends string
        ? `${Prefix}${K}`
        : never]: SubSchema[K];
  }
>;

/**
 * Helper to cast plugin return types
 * @example
 * ```ts
 * return asPlugin<{ store: MyStore; decorators: {}; schema: {} }, Schema>(app);
 * ```
 */
export function asPlugin<NewDefs extends TritioDefs, Schema>(
  app: Tritio<any, Schema>
): Tritio<NewDefs, Schema> {
  return app as unknown as Tritio<NewDefs, Schema>;
}
