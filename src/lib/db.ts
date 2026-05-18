import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Direct Postgres connection via Drizzle ORM.
 * Only available server-side — uses DATABASE_URL from .env.local.
 * Pooled via a global singleton to avoid exceeding connection limits
 * in Next.js hot-reload / serverless environments.
 */
const globalForDb = global as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

const connectionString = process.env.DATABASE_URL!;

// Reuse connection in dev to avoid pool exhaustion on HMR
const client = globalForDb.pgClient ?? postgres(connectionString, {
  max: 10,          // max connection pool size
  idle_timeout: 20, // close idle connections after 20s
  connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });

export type DB = typeof db;
