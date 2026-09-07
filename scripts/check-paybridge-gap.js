require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  const result = await pool.query(`SELECT role, required_skills, status FROM gaps WHERE role ILIKE '%compliance%'`);
  console.log('Real compliance-related gaps found:');
  for (const row of result.rows) console.log(` - ${row.role}: requires [${row.required_skills}] | status=${row.status}`);
  await pool.end();
  process.exit(0);
}
run();
