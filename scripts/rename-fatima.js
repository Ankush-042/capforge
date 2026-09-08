/**
 * Real rename: c2.fatima@seed.test → c2.sam@seed.test, "Fatima Sheikh" → "Sam Carter".
 * Direct DB update since email changes aren't an app feature — this is
 * test/seed data, not a real user's account.
 * Run: node scripts/rename-fatima.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const userResult = await pool.query(`SELECT id FROM users WHERE email = 'c2.fatima@seed.test'`);
  if (userResult.rows.length === 0) { console.log('User not found — nothing to rename.'); await pool.end(); return; }
  const userId = userResult.rows[0].id;

  await pool.query(`UPDATE users SET email = 'c2.sam@seed.test' WHERE id = $1`, [userId]);
  await pool.query(`UPDATE profiles SET display_name = 'Sam Carter' WHERE user_id = $1`, [userId]);

  const verify = await pool.query(
    `SELECT u.email, p.display_name FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`, [userId]
  );
  console.log('Renamed successfully:', verify.rows[0]);
  await pool.end();
  process.exit(0);
}
run();
