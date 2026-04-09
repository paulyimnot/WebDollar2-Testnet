
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

// 🛡️ CRITICAL PREVENTATIVE MEASURE: Prevent Node.js from crashing if Render drops idle connections
pool.on('error', (err, client) => {
  console.error('[DATABASE POOL ERROR] Unexpected error on idle client:', err);
});

export const db = drizzle(pool, { schema });
