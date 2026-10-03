require('dotenv').config();
/**
 * A full database backup, as one file.
 *
 * The free Supabase tier has no automatic backups. If the project is
 * corrupted, deleted, or something goes wrong during a migration, there is
 * nothing to restore from and every seeded venture, conversation and
 * recommendation is gone. That is not a recoverable position two weeks
 * before a presentation.
 *
 * This writes a plain SQL dump that pg_restore or psql can replay into any
 * empty Postgres. Keep a copy somewhere that is not this laptop.
 *
 * Usage:
 *   node scripts/backup.js
 *
 * Restore (into an EMPTY database — never the live one by accident):
 *   psql "<connection string>" < backups/capforge-YYYY-MM-DD.sql
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Nothing to back up.');
  process.exit(1);
}

const dir = path.join(__dirname, '..', 'backups');
fs.mkdirSync(dir, { recursive: true });

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const file = path.join(dir, `capforge-${stamp}.sql`);

console.log('Backing up. This takes a minute on a slow connection.\n');

try {
  // --no-owner and --no-acl so the dump restores into a database with
  // different role names, which a fresh Supabase project will have.
  execSync(`pg_dump "${url}" --no-owner --no-acl --clean --if-exists -f "${file}"`,
    { stdio: 'inherit', timeout: 900000 });
} catch (err) {
  console.error('\npg_dump failed.');
  console.error('If the error is "command not found", install the PostgreSQL client tools:');
  console.error('  Windows: https://www.postgresql.org/download/windows/ (uncheck the server, keep Command Line Tools)');
  console.error('  macOS:   brew install libpq && brew link --force libpq');
  console.error('  Linux:   sudo apt install postgresql-client');
  console.error('\nIf it is a version mismatch, the client must be the same major version as the server or newer.');
  process.exit(1);
}

const bytes = fs.statSync(file).size;
if (bytes < 10000) {
  console.error(`\nThe dump is only ${bytes} bytes, which is too small to be real. Treat it as failed.`);
  process.exit(1);
}

console.log(`\nWrote ${path.relative(path.join(__dirname, '..'), file)}  (${(bytes / 1048576).toFixed(1)} MB)`);
console.log('\nNow copy it somewhere that is not this laptop — Drive, a USB stick, anywhere.');
console.log('A backup that only exists in one place is not a backup.');
process.exit(0);
