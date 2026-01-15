import { Type } from 'typebox'

export const t = {
    ...Type,
    Email: (options?: any) => Type.String({format: 'email', ...options}),
    Numeric: (options?: any) => Type.Number({format: 'double', ...options}),
}
