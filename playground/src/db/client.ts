import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const url = process.env.TURSO_URL;
const authToken = process.env.TURSO_TOKEN;

if (!url) {
  console.warn('TURSO_URL is not set in environment variables.');
}

const client = createClient({
  url: url || 'file:local.db',
  authToken: authToken,
});

export const db = drizzle(client, { schema });
