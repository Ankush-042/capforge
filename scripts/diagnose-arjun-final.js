require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const userResult = await pool.query(`SELECT id, primary_role FROM users WHERE email = 'c.arjun@seed.test'`);
  const userId = userResult.rows[0].id;

  const profileResult = await pool.query(`SELECT skills FROM profiles WHERE user_id = $1`, [userId]);
  console.log('Arjun real current skills in DB:', profileResult.rows[0]?.skills);

  const result = await pool.query(
    `SELECT r.status as rec_status, r.score, s.name as startup_name, g.role as gap_role, g.status as gap_status, g.required_skills
     FROM recommendations r
     JOIN startups s ON s.id = r.startup_id
     LEFT JOIN gaps g ON g.id = r.source_gap_id
     WHERE r.target_user_id = $1 AND r.recommendation_type = 'CONTRIBUTOR' AND r.status = 'ACTIVE'
     ORDER BY r.score DESC`,
    [userId]
  );
  console.log(`\nArjun's ACTIVE recommendations right now: ${result.rows.length}`);
  for (const row of result.rows) {
    console.log(`  ${row.startup_name} — ${row.gap_role} (needs: ${row.required_skills}) | gap_status=${row.gap_status} | score=${row.score}`);
  }
  await pool.end();
  process.exit(0);
}
run();
