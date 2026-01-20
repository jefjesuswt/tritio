import { Tritio } from './tritio';

export {
  type Context,
  type GenericContext,
  type RouteSchema,
  type TritioOptions,
  type TritioPlugin,
  type GlobalHook,
  type ErrorHook,
  type ContextHook,
  type TransformHook,
  asPlugin,
} from './types.js';

export * from './tritio';
export * from './validation';
export * from './core';
export * from './http';

export type InferApp<T> = T extends Tritio<any, infer S> ? S : never;
