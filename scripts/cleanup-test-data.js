/**
 * Real cleanup for a confirmed bug: baseline-benchmark.js and
 * consistency-tests.js create REAL startups+founder accounts every
 * time they run, with no cleanup afterward — baseline-benchmark.js in
 * particular used an identical hardcoded name ("Bench-Health",
 * "Bench-Fintech") on every single run, so repeated runs left
 * multiple real, duplicate-named test startups polluting the actual
 * ecosystem (visible in real contributor recommendations).
 *
 * Deletes every startup whose name matches the known test-script
 * prefixes. ON DELETE CASCADE (per the schema) correctly removes their
 * gaps, recommendations, and readiness data along with them.
 *
 * Run: node scripts/cleanup-test-data.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const result = await pool.query(
    `DELETE FROM startups WHERE name LIKE 'Bench-%' OR name LIKE 'ConsistTest-%' OR name LIKE 'FoodSense%' RETURNING name`
  );
  console.log(`Deleted ${result.rows.length} throwaway test startups:`, result.rows.map(r => r.name).join(', ') || '(none found)');
  await pool.end();
}
run();
