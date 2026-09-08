require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  const result = await pool.query(
    `SELECT s.name, s.verification_status, s.status, u.email, u.created_at
     FROM startups s JOIN users u ON u.id = s.founder_id WHERE s.name = 'AdPilot'`
  );
  console.log(result.rows);
  await pool.end();
  process.exit(0);
}
run();
