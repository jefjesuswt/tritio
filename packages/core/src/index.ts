import { Tritio } from './tritio';

export * from './types';
export * from './tritio';
export * from './validation';
export * from './core';
export * from './http';

export type InferApp<T> = T extends Tritio<any, infer S> ? S : never;
