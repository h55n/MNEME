import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';
if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'test') {
  console.warn('Warning: DATABASE_URL is not set');
}

// postgres.js connection pool
const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;

export * from './schema.js';
