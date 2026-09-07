/**
 * Real cleanup for a confirmed bug: recommendations pointing at gaps
 * that are now FILLED were never expired when the gap became filled
 * through team formation — they stayed ACTIVE and were shown as real,
 * actionable opportunities (confirmed directly: NeuraHealth's AI/ML
 * Engineer showed as a live recommendation despite its own reason text
 * saying "covered — a current team member holds the role").
 *
 * Run: node scripts/cleanup-filled-gap-recommendations.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const result = await pool.query(
    `UPDATE recommendations SET status = 'EXPIRED'
     WHERE status = 'ACTIVE' AND source_gap_id IN (SELECT id FROM gaps WHERE status = 'FILLED')
     RETURNING id`
  );
  console.log(`Expired ${result.rows.length} recommendations pointing at gaps that are now filled.`);
  await pool.end();
}
run();
