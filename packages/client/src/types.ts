export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Method = 'get' | 'post' | 'put' | 'delete' | 'patch';

export interface RouteDefinition {
  input?: any;
  output?: any;
}

type RequestClient<Input, Output> = Input extends undefined | null
  ? (options?: RequestInit) => Promise<Output>
  : (input: Input, options?: RequestInit) => Promise<Output>;

type MethodClient<Routes> = {
  [M in keyof Routes]: Routes[M] extends RouteDefinition
    ? RequestClient<Routes[M]['input'], Routes[M]['output']>
    : never;
};

type StripSlash<T> = T extends `/${infer R}` ? R : T;

type Split<S extends string> = S extends `${infer Head}/${infer Tail}`
  ? [Head, ...Split<Tail>]
  : [S];

type PathToObject<Segments extends string[], Value> = Segments extends [
  infer Head extends string,
  ...infer Tail extends string[],
]
  ? { [K in Head]: Tail['length'] extends 0 ? Value : PathToObject<Tail, Value> }
  : Value;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

export type Client<Schema> = Prettify<
  UnionToIntersection<
    {
      [K in keyof Schema]: PathToObject<Split<StripSlash<K & string>>, MethodClient<Schema[K]>>;
    }[keyof Schema]
  >
>;
