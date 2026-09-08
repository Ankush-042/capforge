/**
 * Real, complete deletion — no trace left. Deletes:
 * 1. The 3 named personal test accounts, per direct request.
 * 2. Leftover internal test-script artifacts (consist-*, bench-*,
 *    dqtest*) that were supposed to self-clean after running and
 *    didn't — these were never meant to persist as real accounts.
 * Relies on ON DELETE CASCADE (profiles, startups, gaps, etc. all
 * reference users with cascade) for a genuinely complete removal.
 * Run: node scripts/delete-accounts.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const result = await pool.query(
    `DELETE FROM users
     WHERE email IN ('ashdinso51@gmail.com', 'ankush.232713105@vcet.edu.in', 'pixelnova490@gmail.com')
        OR email LIKE 'consist-%' OR email LIKE 'bench-%' OR email LIKE 'dqtest%'
     RETURNING email`
  );
  console.log(`Deleted ${result.rows.length} accounts completely:`);
  for (const row of result.rows) console.log(`  - ${row.email}`);
  await pool.end();
  process.exit(0);
}
run().catch(err => { console.error('Deletion failed:', err.message); process.exit(1); });
