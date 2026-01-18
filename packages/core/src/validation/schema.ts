import { Type } from 'typebox';

type StringOptions = Parameters<typeof Type.String>[0];
type NumberOptions = Parameters<typeof Type.Number>[0];

export const t = {
  ...Type,
  Email: (options?: StringOptions) => Type.String({ format: 'email', ...options }),
  Numeric: (options?: NumberOptions) => Type.Number({ format: 'double', ...options }),
};
