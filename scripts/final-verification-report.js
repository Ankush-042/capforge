require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  const result = await pool.query(
    `SELECT s.name as startup_name, g.role, g.required_skills,
            (SELECT COUNT(*) FROM recommendations r WHERE r.source_gap_id = g.id AND r.status = 'ACTIVE') as candidate_count,
            (SELECT p.display_name FROM recommendations r JOIN profiles p ON p.user_id = r.target_user_id
             WHERE r.source_gap_id = g.id AND r.status = 'ACTIVE' ORDER BY r.score DESC LIMIT 1) as top_candidate,
            (SELECT r.score FROM recommendations r WHERE r.source_gap_id = g.id AND r.status = 'ACTIVE' ORDER BY r.score DESC LIMIT 1) as top_score
     FROM gaps g JOIN startups s ON s.id = g.startup_id JOIN users u ON u.id = s.founder_id
     WHERE g.status != 'FILLED' AND u.email != 'system.import@capforge.internal' AND s.verification_status != 'UNVERIFIED'
     ORDER BY candidate_count ASC, s.name`
  );
  console.log('=== Final verification: every real gap, its top real candidate, sorted worst-covered first ===\n');
  for (const row of result.rows) {
    const flag = row.candidate_count == 0 ? '⚠ ZERO' : '✓';
    console.log(`${flag} ${row.startup_name} — ${row.role} [${row.required_skills}]`);
    console.log(`    → ${row.candidate_count} candidates | top: ${row.top_candidate || 'none'} (${row.top_score ? Math.round(row.top_score * 100) + '%' : 'n/a'})`);
  }
  await pool.end();
  process.exit(0);
}
run();
