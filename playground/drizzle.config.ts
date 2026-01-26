import { defineConfig } from 'drizzle-kit';

// Config check
const url = process.env.TURSO_URL;
const token = process.env.TURSO_TOKEN;

if (!url || !token) {
  throw new Error('Missing TURSO config in process.env');
}

export default defineConfig({
  schema: ['./src/db/schema.ts', './src/features/**/schema.ts'],
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: url.replace('libsql://', 'https://'),
    authToken: token,
  },
});
