/**
 * Shared database connection pool.
 * Ref: TRD §102 — database is the authoritative application state.
 */
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required (Supabase connection string).');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Supabase requires SSL
});

module.exports = pool;
