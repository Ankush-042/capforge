require('dotenv').config();
/**
 * Can a brand new person sign up and get matched, with nobody running a script?
 *
 * THIS IS THE TEST THAT WAS MISSING, and its absence is why the engine was
 * repeatedly declared working while a real signup got nothing.
 *
 * Every other test runs against data that the maintenance scripts had already
 * populated. That makes them circular: all 17 quality rules passed while a
 * genuine new account scored zero against all 62 open roles. They were testing
 * a world where somebody had already been to the terminal.
 *
 * This one creates a real account through the real registration path, saves a
 * profile through the real endpoint, and then asks the only question that
 * matters: does this person have matches now, without anyone having run
 * anything by hand?
 *
 * Every bug found today would have been caught by this test:
 *   - the inner JOIN that made anyone without a contributor_profiles row
 *     invisible to every gap
 *   - the embedding race, where ranking read a null embedding
 *   - role fit returning 0 for any headline that is not one clean job title
 *   - gaps having no embeddings at all
 *   - the judgement layer only ever running from a script
 *
 * It cleans up after itself, so it can be run as often as you like.
 *
 * Usage: node scripts/test-cold-signup.js
 */
const pool = require('../backend/shared/db');
const { register } = require('../backend/auth/authService');
const { updateBaseProfile, upsertContributorProfile } = require('../backend/profiles/profileService');

const STAMP = Date.now();
const EMAIL = `coldtest.${STAMP}@capforge.test`;

// Deliberately shaped like a REAL person rather than like the seed data:
// a compound headline, few listed skills, and a mission written in prose.
// Seeded profiles are clean single job titles with long skill lists, which is
// exactly why they never exposed any of this.
const PERSON = {
  displayName: 'Cold Signup Test',
  headline: 'AI/ML Engineering, Data Analysis, Product Development',
  skills: ['python'],
  lookingFor: 'I want to work on products that use AI to make learning more accessible and personalised. I care about education, not generic AI tooling.',
  preferredDomains: ['edtech'],
  preferredStage: ['prototype'],
};

const results = [];
const check = (name, pass, detail) => { results.push({ name, pass, detail }); };

async function cleanup(userId) {
  if (!userId) return;
  // ON DELETE CASCADE handles the rest.
  await pool.query('DELETE FROM users WHERE id = $1', [userId]).catch(() => {});
}

(async () => {
  console.log('COLD SIGNUP TEST');
  console.log('='.repeat(70));
  console.log('Creating a real account and asking whether it gets matched,');
  console.log('without anyone running a maintenance script.\n');

  let userId = null;

  try {
    // --- 1. Register, through the real path ---
    const reg = await register({
      email: EMAIL, password: 'ColdTest12345', displayName: PERSON.displayName,
      primaryRole: 'CONTRIBUTOR',
    });
    check('registration succeeds', reg.success, reg.error || '');
    if (!reg.success) throw new Error(`registration failed: ${reg.error}`);
    userId = reg.user.id;
    console.log(`  created ${EMAIL}\n`);

    // --- 2. Save a profile, through the real service ---
    const base = await updateBaseProfile(userId, {
      headline: PERSON.headline, skills: PERSON.skills,
    });
    check('saving basics succeeds', base.success, base.error || '');

    const contrib = await upsertContributorProfile(userId, {
      lookingFor: PERSON.lookingFor,
      preferredDomains: PERSON.preferredDomains,
      preferredStage: PERSON.preferredStage,
      availability: 'part-time',
      experienceYears: 3,
    });
    check('saving the contributor section succeeds', contrib.success, contrib.error || '');

    // --- 3. The REAL chain the save endpoint fires. ---
    //
    // This used to reimplement the chain step by step, and had already drifted
    // from it: it skipped alignment scoring entirely, so the mismatch dampener
    // never fired and the test measured a scoring path no real save ever
    // takes. A test that rebuilds the thing it tests will always drift.
    console.log('  running the actual refresh the save endpoint triggers...\n');
    const { refreshEverythingForUser } = require('../backend/profiles/profileRoutes');
    await refreshEverythingForUser(userId);

    check('a profile embedding was generated',
      (await pool.query('SELECT embedding IS NOT NULL AS has FROM profiles WHERE user_id = $1', [userId])).rows[0]?.has === true,
      'without it, semantic similarity is null everywhere');

    const judged = (await pool.query(
      'SELECT COUNT(*)::int AS n FROM match_judgements WHERE user_id = $1', [userId]
    )).rows[0].n;
    check('the judgement layer ran for a new person', judged > 0, `${judged} roles judged`);

    const aligned = (await pool.query(
      'SELECT COUNT(*)::int AS n FROM alignment_scores WHERE user_id = $1', [userId]
    )).rows[0].n;
    check('alignment was scored for a new person', aligned > 0,
      aligned > 0 ? `${aligned} ventures` : 'none, so the mismatch dampener cannot fire');

    // --- 4. THE QUESTION THAT MATTERS ---
    const recs = (await pool.query(
      `SELECT r.score, s.name AS startup_name, g.role, s.domain
       FROM recommendations r
       JOIN startups s ON s.id = r.startup_id
       JOIN gaps g ON g.id = r.source_gap_id
       WHERE r.target_user_id = $1 AND r.status = 'ACTIVE' AND r.score >= 0.20
       ORDER BY r.score DESC`,
      [userId]
    )).rows;

    console.log(`  ${recs.length} role(s) matched:\n`);
    for (const r of recs.slice(0, 8)) {
      console.log(`    ${String(Math.round(parseFloat(r.score) * 100)).padStart(3)}%  ${r.startup_name} / ${r.role}`);
    }
    console.log('');

    check('a new signup gets matches at all', recs.length > 0,
      recs.length === 0 ? 'ZERO. This is the failure that started all of this.' : `${recs.length} roles`);

    // Not merely "some matches": the RIGHT ones. This person said edtech and
    // ML. A run that returns nine unrelated ventures is not a pass.
    const inTheirField = recs.filter((r) =>
      (r.domain || []).some((d) => String(d).toLowerCase().includes('edtech') || String(d).toLowerCase().includes('education')));
    check('at least one match is in the field they chose', inTheirField.length > 0,
      inTheirField.length > 0 ? inTheirField.map(r => r.startup_name).join(', ') : 'nothing in edtech, despite it being their only stated field');

    const top = recs[0];
    const topInField = top && (top.domain || []).some((d) =>
      String(d).toLowerCase().includes('edtech') || String(d).toLowerCase().includes('education'));
    check('their stated field ranks at the top', Boolean(topInField),
      top ? `top is ${top.startup_name} (${(top.domain || []).join(', ')})` : 'no matches');

  } catch (err) {
    check('the test ran without throwing', false, err.message);
  } finally {
    await cleanup(userId);
    console.log('  test account removed\n');
  }

  console.log('='.repeat(70));
  let failed = 0;
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}`);
    if (r.detail) console.log(`      ${r.detail}`);
    if (!r.pass) failed++;
  }
  console.log('='.repeat(70));
  console.log(`${results.length - failed} passed, ${failed} failed`);
  console.log(failed === 0
    ? '\nA stranger can sign up and be matched, with nobody running anything.'
    : '\nA new signup does NOT work. Everything else passing is irrelevant.');

  await pool.end();
  process.exit(failed === 0 ? 0 : 1);
})();
