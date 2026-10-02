require('dotenv').config();
/**
 * One command that tells you what is wrong, and fixes what it safely can.
 *
 * WHY THIS EXISTS. This project will be run and demonstrated by one person
 * with no help available. A script that prints a stack trace is useless in
 * that situation: it names a symptom to somebody who needs a cure. So every
 * check here reports three things — what is wrong, what it means for the
 * person using the product, and the exact command that repairs it — and with
 * --fix it runs that command itself.
 *
 * IT CHANGES NOTHING UNLESS RUN. This is a separate script. Nothing in the
 * application calls it, imports it, or depends on it. On a good day it does
 * not exist as far as the product is concerned, which is the same rule the
 * error boundary follows: error-proofing must not become the damage.
 *
 * AND --fix IS DELIBERATELY NARROW. It only runs repairs that regenerate
 * derived data: embeddings, alignment scores, rankings, readiness. Every one
 * of those is computed FROM something and can be computed again. It will
 * never delete, never migrate, never touch anything a person wrote. Anything
 * ambiguous or destructive it refuses and explains instead, because a repair
 * tool that guesses is a worse problem than the fault it was fixing.
 *
 * Usage:
 *   node scripts/doctor.js              check and report
 *   node scripts/doctor.js --fix        check and repair what is safe
 *   node scripts/doctor.js --rehearse   the night before: fix, then verify
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FIX = process.argv.includes('--fix') || process.argv.includes('--rehearse');
const REHEARSE = process.argv.includes('--rehearse');

const ROOT = path.join(__dirname, '..');
const results = [];
let pool = null;

const ok = (name, detail) => results.push({ level: 'OK', name, detail });
const warn = (name, detail, means, fix) => results.push({ level: 'WARN', name, detail, means, fix });
const fail = (name, detail, means, fix) => results.push({ level: 'FAIL', name, detail, means, fix });

function run(cmd) {
  execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 900000 });
}

// ---------------------------------------------------------------------------
async function checkEnvironment() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'GROQ_API_KEY'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    fail('Environment', `Missing: ${missing.join(', ')}`,
      'The backend will not start at all.',
      'Add them to .env in the project root. Without DATABASE_URL nothing works; without GROQ_API_KEY the AI features degrade but the product still runs.');
    return false;
  }
  ok('Environment', 'Every required variable is set.');
  return true;
}

async function checkDatabase() {
  try {
    pool = require('../backend/shared/db');
    const r = await pool.query('SELECT 1 AS up');
    if (r.rows[0].up !== 1) throw new Error('unexpected response');
    ok('Database', 'Reachable.');
    return true;
  } catch (err) {
    fail('Database', err.message,
      'Nothing in the product works. Every page will fail to load.',
      'Check DATABASE_URL in .env, and that the Supabase project is not paused. A free Supabase project pauses after a week of inactivity and is resumed from its dashboard.');
    return false;
  }
}

async function checkMigrations() {
  const dir = path.join(ROOT, 'database', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const expectedTables = ['users', 'startups', 'gaps', 'recommendations', 'readiness_assessments',
    'conversations', 'messages', 'launches', 'launch_comments', 'investor_watchlist', 'alignment_scores'];

  const present = (await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  )).rows.map((r) => r.table_name);

  const missing = expectedTables.filter((t) => !present.includes(t));
  if (missing.length > 0) {
    fail('Migrations', `These tables do not exist: ${missing.join(', ')}`,
      'The features that use them will throw on every request.',
      `Apply the migrations in database/migrations in filename order, in the Supabase SQL editor. There are ${files.length} of them; the latest is ${files[files.length - 1]}.`);
    return;
  }

  // The column a migration adds is the real test: a table can exist from an
  // earlier migration while a later one that alters it was never applied.
  const cols = (await pool.query(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`
  )).rows;
  const has = (t, c) => cols.some((x) => x.table_name === t && x.column_name === c);

  const late = [
    ['readiness_assessments', 'breakdown', '038_readiness_breakdown.sql'],
    ['startups', 'entity_type', '040_scheme_eligibility.sql'],
    ['launches', 'asking_about', '039_launches.sql'],
  ].filter(([t, c]) => !has(t, c));

  if (late.length > 0) {
    fail('Migrations', `Applied up to a point, then stopped. Missing: ${late.map(([, , f]) => f).join(', ')}`,
      'The newest features will fail while everything older keeps working, which is confusing to diagnose.',
      `Run these in the Supabase SQL editor, in order: ${late.map(([, , f]) => `database/migrations/${f}`).join(', ')}`);
    return;
  }

  ok('Migrations', `All ${files.length} applied.`);
}

async function checkGroqKeys() {
  const keys = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3].filter(Boolean);
  if (keys.length === 0) {
    warn('Groq keys', 'None set.',
      'Every AI feature degrades: the assistant, structuring, market signal. The product still runs and every score still computes, because none of them use the model.',
      'Add GROQ_API_KEY to .env.');
    return;
  }

  const live = [];
  const dead = [];
  for (const [i, key] of keys.entries()) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) live.push(i + 1);
      else dead.push(`${i + 1} (${res.status})`);
    } catch {
      dead.push(`${i + 1} (unreachable)`);
    }
  }

  if (live.length === 0) {
    warn('Groq keys', `None of the ${keys.length} work: ${dead.join(', ')}`,
      'Every AI surface degrades to its fallback. Nothing breaks: scores, matching, readiness and equity are all rules and do not use the model. Creating a NEW venture will fail, because structuring needs it.',
      'A 429 means the daily limit is used up and resets at midnight UTC. A 401 means the key is revoked and needs replacing at console.groq.com.');
  } else if (dead.length > 0) {
    warn('Groq keys', `${live.length} of ${keys.length} working. Dead: ${dead.join(', ')}`,
      'It still works, with less headroom before rate limits bite.',
      'Replace the dead keys at console.groq.com when convenient.');
  } else {
    ok('Groq keys', `All ${keys.length} working.`);
  }
}

async function checkFrontendBuild() {
  const dist = path.join(ROOT, 'frontend', 'dist', 'index.html');
  if (!fs.existsSync(dist)) {
    fail('Frontend build', 'frontend/dist does not exist.',
      'The backend will serve nothing at the root URL.',
      'npm --prefix frontend run build');
    return;
  }

  // Stale is worse than missing: it loads, and shows an older product.
  const built = fs.statSync(dist).mtimeMs;
  let newest = 0;
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else newest = Math.max(newest, fs.statSync(p).mtimeMs);
    }
  })(path.join(ROOT, 'frontend', 'src'));

  if (newest > built) {
    const mins = Math.round((newest - built) / 60000);
    if (FIX) {
      try {
        run('npm --prefix frontend run build');
        ok('Frontend build', 'Was stale, rebuilt.');
      } catch {
        fail('Frontend build', 'Stale, and the rebuild failed.',
          'You are looking at an older version of the product.',
          'npm --prefix frontend run build, and read the error it prints.');
      }
    } else {
      fail('Frontend build', `Source is ${mins} minute(s) newer than the build.`,
        'You are looking at an older version of the product than the code says.',
        'npm --prefix frontend run build');
    }
  } else {
    ok('Frontend build', 'Current.');
  }
}

async function checkDerivedData() {
  const q = async (sql) => (await pool.query(sql)).rows[0];

  const ventures = await q(
    `SELECT COUNT(*)::int AS n FROM startups WHERE verification_status != 'UNVERIFIED'`);
  if (ventures.n === 0) {
    fail('Ventures', 'There are none.',
      'Every page is empty for everybody. Nothing will demonstrate.',
      'The database is empty or pointing at the wrong project. Check DATABASE_URL.');
    return;
  }
  ok('Ventures', `${ventures.n} on the platform.`);

  const noEmbedding = await q(
    `SELECT COUNT(*)::int AS n FROM gaps WHERE status NOT IN ('FILLED','DISMISSED') AND embedding IS NULL`);
  if (noEmbedding.n > 0) {
    const fixCmd = 'node scripts/backfill-gap-embeddings.js';
    if (FIX) {
      try { run(fixCmd); ok('Gap embeddings', `${noEmbedding.n} were missing, backfilled.`); }
      catch { fail('Gap embeddings', `${noEmbedding.n} missing and the backfill failed.`, 'Semantic matching returns nothing for those roles.', fixCmd); }
    } else {
      fail('Gap embeddings', `${noEmbedding.n} open role(s) have none.`,
        'Matching for those roles falls back to keywords only, so good candidates are missed.', fixCmd);
    }
  } else {
    ok('Gap embeddings', 'Every open role has one.');
  }

  const recs = await q(`SELECT COUNT(*)::int AS n FROM recommendations WHERE status = 'ACTIVE'`);
  if (recs.n === 0) {
    const fixCmd = 'node scripts/rerank-everything.js';
    if (FIX) {
      try { run(fixCmd); ok('Recommendations', 'Were empty, regenerated.'); }
      catch { fail('Recommendations', 'Empty and the rerank failed.', 'Nobody sees any matches anywhere.', fixCmd); }
    } else {
      fail('Recommendations', 'There are none.',
        'Every contributor sees no opportunities and every founder sees no candidates.', fixCmd);
    }
  } else {
    ok('Recommendations', `${recs.n} active.`);
  }

  const stale = await q(
    `SELECT COUNT(*)::int AS n FROM recommendations r
     JOIN gaps g ON g.id = r.source_gap_id
     WHERE r.status = 'ACTIVE' AND g.status IN ('FILLED','DISMISSED')`);
  if (stale.n > 0) {
    const fixCmd = 'node scripts/expire-stale-recommendations.js';
    if (FIX) {
      try { run(fixCmd); ok('Stale recommendations', `${stale.n} cleared.`); }
      catch { warn('Stale recommendations', `${stale.n} point at closed roles.`, 'People are shown roles nobody can take.', fixCmd); }
    } else {
      warn('Stale recommendations', `${stale.n} point at a filled or dismissed role.`,
        'Somebody will apply for a role that is already gone.', fixCmd);
    }
  } else {
    ok('Stale recommendations', 'None.');
  }

  const noReadiness = await q(
    `SELECT COUNT(*)::int AS n FROM startups s
     WHERE s.verification_status != 'UNVERIFIED'
       AND NOT EXISTS (SELECT 1 FROM readiness_assessments ra WHERE ra.startup_id = s.id)`);
  if (noReadiness.n > 0) {
    const fixCmd = 'node scripts/recompute-readiness.js';
    if (FIX) {
      try { run(fixCmd); ok('Readiness', `${noReadiness.n} were unassessed, computed.`); }
      catch { warn('Readiness', `${noReadiness.n} venture(s) unassessed.`, 'They show no score and rank low to investors.', fixCmd); }
    } else {
      warn('Readiness', `${noReadiness.n} venture(s) have never been assessed.`,
        'They show no score and sit at the bottom of every investor deal flow.', fixCmd);
    }
  } else {
    ok('Readiness', 'Every venture has been assessed.');
  }

  const noVision = await q(
    `SELECT COUNT(*)::int AS n FROM startups
     WHERE verification_status != 'UNVERIFIED' AND (founder_vision IS NULL OR founder_vision = '')`);
  if (noVision.n > 0) {
    warn('Founder vision', `${noVision.n} venture(s) have none.`,
      'They get no alignment score against anybody, so they rank on skills alone.',
      'A founder writes this on their own venture. There is no script for it, because it is their words.');
  } else {
    ok('Founder vision', 'Every venture has one.');
  }
}

async function checkQualityRules() {
  try {
    execSync('node scripts/test-matching-quality.js', { cwd: ROOT, stdio: 'pipe', timeout: 300000 });
    ok('Matching quality', 'All rules hold.');
  } catch (err) {
    const out = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
    const failed = out.split('\n').filter((l) => l.startsWith('FAIL')).map((l) => l.replace('FAIL  ', '')).slice(0, 4);
    fail('Matching quality', failed.length ? failed.join('; ') : 'The suite did not pass.',
      'The engine is producing results it should not. A panel asking why somebody matched may get an answer that is wrong.',
      'node scripts/test-matching-quality.js, and read which rule failed. Most are fixed by node scripts/rerank-everything.js');
  }
}

// ---------------------------------------------------------------------------
(async () => {
  console.log(REHEARSE ? 'REHEARSAL — checking everything, repairing what is safe.\n'
    : FIX ? 'Checking, and repairing what is safe.\n'
    : 'Checking. Nothing will be changed. Use --fix to repair.\n');

  const envOk = await checkEnvironment();
  if (!envOk) { report(); process.exit(1); }

  const dbOk = await checkDatabase();
  if (dbOk) {
    await checkMigrations();
    await checkDerivedData();
  }
  await checkGroqKeys();
  await checkFrontendBuild();
  if (dbOk) await checkQualityRules();

  report();

  const fails = results.filter((r) => r.level === 'FAIL').length;
  if (pool) await pool.end();
  process.exit(fails > 0 ? 1 : 0);
})().catch((e) => {
  console.error('\nThe doctor itself failed:', e.message);
  console.error('That is usually DATABASE_URL being wrong or the database being unreachable.');
  process.exit(1);
});

function report() {
  const width = 68;
  console.log('='.repeat(width));
  for (const r of results) {
    const mark = r.level === 'OK' ? '  OK  ' : r.level === 'WARN' ? ' WARN ' : ' FAIL ';
    console.log(`${mark} ${r.name.padEnd(22)} ${r.detail}`);
    if (r.means) console.log(`       ${''.padEnd(22)} ${r.means}`);
    if (r.fix) console.log(`       ${''.padEnd(22)} FIX: ${r.fix}`);
    if (r.means || r.fix) console.log('');
  }
  console.log('='.repeat(width));

  const fails = results.filter((r) => r.level === 'FAIL').length;
  const warns = results.filter((r) => r.level === 'WARN').length;

  if (fails === 0 && warns === 0) {
    console.log(REHEARSE ? '\nREADY. Everything checks out.' : '\nEverything checks out.');
  } else if (fails === 0) {
    console.log(`\nUsable, with ${warns} thing(s) worth knowing. Nothing above will stop a demonstration.`);
  } else {
    console.log(`\n${fails} thing(s) need attention${warns ? `, and ${warns} worth knowing` : ''}.`);
    if (!FIX) console.log('Many of these repair themselves: node scripts/doctor.js --fix');
  }
}
