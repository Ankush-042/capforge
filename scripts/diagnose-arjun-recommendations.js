/**
 * Real diagnostic: shows the ACTUAL current state of a contributor's
 * recommendations directly — status, score, and the real gap it points
 * to — rather than guessing why Opportunities is empty.
 * Run: node scripts/diagnose-arjun-recommendations.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const userResult = await pool.query(`SELECT id FROM users WHERE email = 'c.arjun@seed.test'`);
  if (userResult.rows.length === 0) { console.log('Arjun not found.'); return; }
  const userId = userResult.rows[0].id;

  const result = await pool.query(
    `SELECT r.id, r.status as rec_status, r.score, r.source_gap_id, s.name as startup_name,
            g.role as gap_role, g.status as gap_status
     FROM recommendations r
     JOIN startups s ON s.id = r.startup_id
     LEFT JOIN gaps g ON g.id = r.source_gap_id
     WHERE r.target_user_id = $1 AND r.recommendation_type = 'CONTRIBUTOR'
     ORDER BY r.score DESC`,
    [userId]
  );

  console.log(`=== All ${result.rows.length} recommendation rows for Arjun (any status) ===\n`);
  for (const row of result.rows) {
    console.log(`${row.startup_name} — ${row.gap_role || '(NO GAP — orphaned)'} | rec_status=${row.rec_status} | gap_status=${row.gap_status || 'N/A'} | score=${row.score}`);
  }
  await pool.end();
}
run();
