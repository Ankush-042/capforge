require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  const result = await pool.query(
    `SELECT u.email, p.display_name, p.skills, cp.id as contributor_profile_id
     FROM profiles p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN contributor_profiles cp ON cp.profile_id = p.id
     WHERE u.primary_role = 'CONTRIBUTOR'
     ORDER BY u.created_at`
  );
  const missing = result.rows.filter(r => !r.contributor_profile_id);
  console.log(`=== ${result.rows.length} total contributors, ${missing.length} MISSING their contributor_profiles row ===\n`);
  for (const row of missing) console.log(`  ✗ ${row.email} — ${row.display_name} (skills: [${row.skills}]) — NO contributor_profiles row at all`);
  await pool.end();
  process.exit(0);
}
run();
