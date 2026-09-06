/**
 * Real cleanup for a confirmed bug: recommendations whose gap was
 * later deleted (via re-diagnosis, before the write-time fix existed)
 * were orphaned (source_gap_id = NULL via ON DELETE SET NULL) but
 * left ACTIVE — shown to real contributors with a broken blank role
 * name (confirmed directly: NeuraHealth's entry in a real user's
 * Opportunities list). Expires anything already orphaned right now.
 *
 * Run: node scripts/cleanup-stale-recommendations.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const result = await pool.query(
    `UPDATE recommendations SET status = 'EXPIRED' WHERE status = 'ACTIVE' AND source_gap_id IS NULL RETURNING id`
  );
  console.log(`Expired ${result.rows.length} already-orphaned recommendations (gap was deleted, reference had gone stale).`);
  await pool.end();
}
run();
