require('dotenv').config();
/**
 * Look at accounts, and reset a password when you are locked out.
 *
 * Passwords are bcrypt-hashed, so there is nothing to look up: the plaintext
 * does not exist anywhere and cannot be recovered. That is correct and worth
 * keeping. What you can do is see exactly which accounts exist and set a new
 * password on one.
 *
 * This also catches the thing that made a fresh signup unreachable: an email
 * stored with leading or trailing whitespace. Register and login both
 * lowercased the address but neither trimmed it, and browsers add whitespace
 * on autofill and paste constantly. The account exists, the password is right,
 * and the lookup still fails, which looks identical to a wrong password.
 *
 * Usage:
 *   node scripts/account-tool.js list                     every account, newest first
 *   node scripts/account-tool.js find <partial-email>     find one
 *   node scripts/account-tool.js reset <email> <password> set a new password
 *   node scripts/account-tool.js fix-whitespace           trim stored emails
 */
const pool = require('../backend/shared/db');
const bcrypt = require('bcryptjs');

const [, , cmd, arg1, arg2] = process.argv;

function show(rows) {
  if (rows.length === 0) { console.log('  nothing found'); return; }
  for (const r of rows) {
    // Quoted so whitespace is VISIBLE. An email with a trailing space looks
    // identical to one without it in any normal listing, which is exactly why
    // this problem is so hard to spot.
    const suspect = r.email !== r.email.trim() ? '   <-- HAS WHITESPACE, this is why login fails' : '';
    console.log(`  "${r.email}"`);
    console.log(`      ${r.primary_role}${r.is_admin ? ' (admin)' : ''} · ${r.display_name || 'no name set'} · joined ${new Date(r.created_at).toLocaleDateString('en-IN')}${suspect}`);
  }
}

(async () => {
  if (cmd === 'list') {
    const r = await pool.query(
      `SELECT u.email, u.primary_role, u.is_admin, u.created_at, p.display_name
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       ORDER BY u.created_at DESC LIMIT 40`
    );
    console.log(`\n${r.rows.length} account(s), newest first:\n`);
    show(r.rows);

  } else if (cmd === 'find') {
    if (!arg1) { console.log('Give me part of an email to look for.'); process.exit(1); }
    const r = await pool.query(
      `SELECT u.email, u.primary_role, u.is_admin, u.created_at, p.display_name
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.email ILIKE $1 ORDER BY u.created_at DESC`,
      [`%${arg1}%`]
    );
    console.log(`\nMatching "${arg1}":\n`);
    show(r.rows);

  } else if (cmd === 'reset') {
    if (!arg1 || !arg2) { console.log('Usage: reset <email> <new-password>'); process.exit(1); }
    if (arg2.length < 8) { console.log('Password must be at least 8 characters, same as signup.'); process.exit(1); }

    // Matches trimmed and case-insensitively, so an account made unreachable
    // by stored whitespace can still be reset.
    const found = await pool.query(
      `SELECT id, email FROM users WHERE lower(trim(email)) = $1`,
      [arg1.trim().toLowerCase()]
    );
    if (found.rows.length === 0) {
      console.log(`\nNo account with that email. Run "list" to see what exists.`);
      await pool.end(); process.exit(1);
    }

    const hash = await bcrypt.hash(arg2, 10);
    await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, found.rows[0].id]);
    console.log(`\nPassword set for "${found.rows[0].email}".`);
    console.log(`Sign in with that exact address and the new password.`);

  } else if (cmd === 'fix-whitespace') {
    const bad = await pool.query(`SELECT id, email FROM users WHERE email != trim(email)`);
    if (bad.rows.length === 0) {
      console.log('\nNo stored emails have whitespace. Not the problem.');
    } else {
      console.log(`\n${bad.rows.length} account(s) stored with whitespace:\n`);
      for (const b of bad.rows) console.log(`  "${b.email}" -> "${b.email.trim()}"`);
      // Trimming could collide with an existing trimmed address, so check
      // rather than blindly updating into a unique-constraint violation.
      for (const b of bad.rows) {
        const clash = await pool.query(
          `SELECT id FROM users WHERE lower(email) = $1 AND id != $2`,
          [b.email.trim().toLowerCase(), b.id]
        );
        if (clash.rows.length > 0) {
          console.log(`\n  SKIPPED "${b.email}": a separate account already uses the trimmed address.`);
          console.log(`  Both exist and only one can keep it. Decide which, then delete the other.`);
          continue;
        }
        await pool.query(`UPDATE users SET email = $1 WHERE id = $2`, [b.email.trim().toLowerCase(), b.id]);
        console.log(`  fixed "${b.email}"`);
      }
    }

  } else {
    console.log(`
Passwords are bcrypt-hashed and cannot be read back. Nothing anywhere stores
the plaintext, which is correct. You can reset one instead.

  node scripts/account-tool.js list
  node scripts/account-tool.js find aarav
  node scripts/account-tool.js reset you@example.com NewPassword123
  node scripts/account-tool.js fix-whitespace
`);
  }

  await pool.end();
  process.exit(0);
})().catch((err) => { console.error('Failed:', err.message); process.exit(1); });
