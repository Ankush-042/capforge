/**
 * Real cleanup for a confirmed bug: before matchingService.js excluded
 * UNVERIFIED (unclaimed/imported) startups from ranking, the import
 * scripts' own /diagnose calls auto-triggered ranking against them
 * (Phase 26's auto-refresh trigger), creating real recommendation rows
 * pointing contributors at ventures with no real, responsive founder —
 * a genuine dead end. This deactivates those existing bad recommendations.
 *
 * Run: node scripts/cleanup-unclaimed-recommendations.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const result = await pool.query(
    `UPDATE recommendations SET status = 'EXPIRED'
     WHERE recommendation_type = 'CONTRIBUTOR' AND status = 'ACTIVE'
       AND startup_id IN (SELECT id FROM startups WHERE verification_status = 'UNVERIFIED')
     RETURNING id`
  );
  console.log(`Deactivated ${result.rows.length} recommendations pointing at unclaimed/imported startups.`);
  await pool.end();
}
run();
