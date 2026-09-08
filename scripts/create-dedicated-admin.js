/**
 * Real fix: is_admin was tangled up with founder.neura@seed.test, an
 * account that ALSO runs a real venture (NeuraHealth) — a genuine
 * architectural mess. Creates a real, distinct, dedicated admin
 * account with no startup of its own, and removes admin privileges
 * from founder.neura entirely.
 * Run: node scripts/create-dedicated-admin.js
 */
require('dotenv').config();
const BASE = 'http://localhost:3000/api';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  // Register a real, distinct admin account (FOUNDER role required by
  // the enum, but this account will never have a startup created for it).
  const reg = await fetch(`${BASE}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@capforge.internal', password: 'SeedPass123!', primaryRole: 'FOUNDER', displayName: 'Platform Admin' })
  }).then(r => r.json());

  if (!reg.token && reg.error !== 'EMAIL_ALREADY_EXISTS') { console.log('Registration failed:', reg.error); await pool.end(); return; }

  await pool.query(`UPDATE users SET is_admin = true WHERE email = 'admin@capforge.internal'`);
  await pool.query(`UPDATE users SET is_admin = false WHERE email = 'founder.neura@seed.test'`);
  await pool.query(`UPDATE profiles SET headline = 'Platform Administrator', bio = 'Manages platform-wide oversight — user accounts, startup verification, and system health.' WHERE user_id = (SELECT id FROM users WHERE email = 'admin@capforge.internal')`);

  const verify = await pool.query(`SELECT email, is_admin FROM users WHERE is_admin = true`);
  console.log('Real, current admin account(s):', verify.rows);
  await pool.end();
  process.exit(0);
}
run();
