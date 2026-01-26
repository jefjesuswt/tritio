import { t } from 'tritio';
import { createSelectSchema } from 'drizzle-typebox';
import { testItems } from './schema';

export const TestItemSchema = createSelectSchema(testItems);
export type TestItem = typeof TestItemSchema.static;

export const PingSchema = {
  response: t.Object({
    message: t.Literal('pong'),
    timestamp: t.Number(),
  }),
};

export const CreateItemSchema = {
  body: t.Object({
    name: t.String({ minLength: 3 }),
  }),
  response: {
    200: t.Object({
      success: t.Boolean(),
      item: t.Object({
        id: t.Number(),
        name: t.String(),
      }),
    }),
  },
};

export const PublicSchema = {
  response: t.Object({
    message: t.String(),
  }),
};
