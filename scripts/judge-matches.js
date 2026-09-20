require('dotenv').config();
/**
 * Judge every contributor against every open role.
 *
 * One call per PERSON across all roles, not one per pair. Per-pair would be
 * thousands of calls, and a model that sees the whole set produces better
 * relative judgements than one judging each role blind. Same batching the
 * alignment layer uses, for the same reasons.
 *
 * Usage:
 *   node scripts/judge-matches.js               judge whoever is unjudged
 *   node scripts/judge-matches.js --force       rejudge everyone
 *   node scripts/judge-matches.js <email>       judge one person
 */
const pool = require('../backend/shared/db');
const { judgeCandidateAgainstGaps, profileFingerprint } = require('../backend/shared/matchJudgement');

const DELAY_MS = 5000; // tokens per minute is the binding limit, not requests
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const force = process.argv.includes('--force');
  const oneEmail = process.argv.find(a => a.includes('@'));

  const gaps = (await pool.query(
    `SELECT g.id, g.role, g.required_skills, g.reason, g.seeking_type,
            s.name AS startup_name, s.problem, s.solution, s.domain, s.stage
     FROM gaps g
     JOIN startups s ON s.id = g.startup_id
     JOIN users u ON u.id = s.founder_id
     WHERE g.status NOT IN ('FILLED','DISMISSED')
       AND u.email != 'system.import@capforge.internal'
       AND s.verification_status != 'UNVERIFIED'
     ORDER BY s.name, g.role`
  )).rows;

  if (gaps.length === 0) { console.log('No open roles to judge against.'); await pool.end(); process.exit(0); }

  const people = (await pool.query(
    `SELECT u.id AS user_id, u.email, p.headline, p.skills, p.bio,
            cp.looking_for, cp.preferred_domains, cp.preferred_stage,
            cp.experience_years, cp.availability
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     LEFT JOIN contributor_profiles cp ON cp.profile_id = p.id
     WHERE u.primary_role = 'CONTRIBUTOR' AND p.visibility = 'DISCOVERABLE'
       AND (array_length(p.skills, 1) > 0 OR p.headline IS NOT NULL)
       ${oneEmail ? 'AND lower(trim(u.email)) = $1' : ''}
     ORDER BY p.headline`,
    oneEmail ? [oneEmail.trim().toLowerCase()] : []
  )).rows;

  // Skip anyone already fully judged against the current version of their own
  // profile. Re-judging unchanged people is pure cost.
  const todo = [];
  for (const person of people) {
    if (force) { todo.push(person); continue; }
    const myHash = profileFingerprint(person);
    const have = await pool.query(
      `SELECT COUNT(*)::int AS n FROM match_judgements
       WHERE user_id = $1 AND profile_hash = $2`,
      [person.user_id, myHash]
    );
    if (have.rows[0].n < gaps.length) todo.push(person);
  }

  console.log(`${gaps.length} open roles, ${todo.length} of ${people.length} people to judge.`);
  if (todo.length === 0) { console.log('Everyone is already judged against their current profile.'); await pool.end(); process.exit(0); }
  console.log(`About ${Math.ceil(todo.length * 7 / 60)} minute(s).\n`);

  let ok = 0, failed = 0;
  for (const person of todo) {
    const r = await judgeCandidateAgainstGaps(person, gaps);
    if (r.failed) {
      failed++;
      console.log(`  FAIL  ${person.headline || person.email}: ${r.reason}${r.detail ? ` — ${String(r.detail).slice(0, 100)}` : ''}`);
    } else {
      ok++;
      const sorted = [...r.judged].sort((a, b) => b.score - a.score);
      console.log(`  OK    ${person.headline || person.email} — ${r.judged.length} roles judged`);
      if (sorted[0]) console.log(`        best:  ${Math.round(sorted[0].score * 100)}% ${sorted[0].startup} / ${sorted[0].role} — "${sorted[0].reason}"`);
      const worst = sorted[sorted.length - 1];
      if (worst) console.log(`        worst: ${Math.round(worst.score * 100)}% ${worst.startup} / ${worst.role}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Judged: ${ok}   Failed: ${failed}`);
  if (failed > 0) console.log('Re-run to retry. Nothing already saved is lost.');
  if (ok > 0) console.log('\nNEXT: node scripts/rerank-everything.js');
  await pool.end();
  process.exit(0);
})().catch(e => { console.error('Failed:', e.message); process.exit(1); });
