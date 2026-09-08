require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  const result = await pool.query(
    `SELECT u.email, u.primary_role, p.display_name, p.headline, p.bio
     FROM profiles p JOIN users u ON u.id = p.user_id
     WHERE u.email != 'system.import@capforge.internal'
     ORDER BY u.primary_role, u.created_at`
  );
  const blank = result.rows.filter(r => !r.headline || !r.bio || r.headline.trim() === '' || r.bio.trim() === '');
  console.log(`=== ${result.rows.length} total real accounts, ${blank.length} with a blank headline and/or bio ===\n`);
  for (const row of blank) {
    console.log(`  ✗ [${row.primary_role}] ${row.email} — ${row.display_name} | headline: "${row.headline || ''}" | bio: "${row.bio || ''}"`);
  }
  await pool.end();
  process.exit(0);
}
run();
