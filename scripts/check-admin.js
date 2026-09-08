require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  const result = await pool.query(`SELECT email, is_admin FROM users WHERE is_admin = true`);
  console.log(result.rows);
  await pool.end();
  process.exit(0);
}
run();
