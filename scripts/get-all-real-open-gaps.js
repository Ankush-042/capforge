/**
 * Step 3: pull FRESH, CURRENT real open-gap data across all 12 real
 * (non-system-import) startups — the original 6 have likely changed
 * since real team formations happened during testing. This is the
 * complete, current, real picture Step 4 will design the contributor
 * skill mapping against.
 *
 * Run: node scripts/get-all-real-open-gaps.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const result = await pool.query(
    `SELECT s.name as startup_name, s.domain, g.role, g.priority_level, g.required_skills, g.status
     FROM gaps g
     JOIN startups s ON s.id = g.startup_id
     JOIN users u ON u.id = s.founder_id
     WHERE g.status != 'FILLED' AND u.email != 'system.import@capforge.internal' AND s.verification_status != 'UNVERIFIED'
     ORDER BY s.name, g.priority_level DESC`
  );

  console.log(`=== ${result.rows.length} real, currently open gaps across all real (non-system-import) startups ===\n`);
  let currentStartup = null;
  for (const row of result.rows) {
    if (row.startup_name !== currentStartup) {
      currentStartup = row.startup_name;
      console.log(`\n${row.startup_name} (${(row.domain || []).join(', ')}):`);
    }
    console.log(`  - ${row.role} (${row.priority_level}): [${row.required_skills}]`);
  }
  await pool.end();
  process.exit(0);
}
run();
