import { sqliteTable, text, int } from 'drizzle-orm/sqlite-core';

export const testItems = sqliteTable('test_items', {
  id: int('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  createdAt: int('created_at', { mode: 'timestamp' }).notNull(),
});
