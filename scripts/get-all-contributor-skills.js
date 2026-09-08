require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  const result = await pool.query(
    `SELECT u.email, p.display_name, p.headline, p.skills
     FROM profiles p JOIN users u ON u.id = p.user_id
     WHERE u.primary_role = 'CONTRIBUTOR' ORDER BY u.created_at`
  );
  console.log(`=== ${result.rows.length} real contributors — current state ===\n`);
  for (const row of result.rows) {
    console.log(`${row.email} | ${row.display_name} (${row.headline}) | skills: [${row.skills}]`);
  }
  await pool.end();
  process.exit(0);
}
run();
