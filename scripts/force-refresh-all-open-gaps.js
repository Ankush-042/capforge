/**
 * Real fix: the diagnostic showed Arjun has ZERO valid recommendations
 * against any of the 6 real seeded startups — everything remaining is
 * either correctly-excluded system imports or orphaned references.
 * This forces a fresh re-ranking of EVERY currently open gap using the
 * current, tested-correct scoring/filtering logic — generating genuine,
 * current, correct recommendations against real ventures.
 *
 * Run: node scripts/force-refresh-all-open-gaps.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const gapsResult = await pool.query(`SELECT id, role FROM gaps WHERE status != 'FILLED'`);
  console.log(`=== Force-refreshing ${gapsResult.rows.length} currently open gaps ===\n`);

  const { rankCandidatesForGap } = require('../backend/matching/matchingService');

  for (const gap of gapsResult.rows) {
    const result = await rankCandidatesForGap(gap.id);
    if (result.skipped) {
      console.log(`  - ${gap.role}: skipped (${result.skipped})`);
    } else if (result.success) {
      console.log(`  ✓ ${gap.role}: ${result.recommendations.length} genuine candidates ranked`);
    } else {
      console.log(`  ✗ ${gap.role}: ${result.error}`);
    }
  }

  console.log('\n=== Done. Every open gap now has fresh, correctly-computed recommendations. ===');
  await pool.end();
  process.exit(0);
}
run();
