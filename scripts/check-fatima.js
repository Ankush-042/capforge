require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  const result = await pool.query(
    `SELECT p.display_name, p.skills, p.embedding IS NOT NULL as has_embedding,
            cp.preferred_domains, cp.preferred_stage, cp.availability, cp.experience_years
     FROM profiles p
     JOIN contributor_profiles cp ON cp.profile_id = p.id
     JOIN users u ON u.id = p.user_id
     WHERE u.email = 'c2.fatima@seed.test'`
  );
  console.log(result.rows);
  await pool.end();
  process.exit(0);
}
run();
