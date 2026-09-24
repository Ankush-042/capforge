require('dotenv').config();
/**
 * How much does the role diagnosis change if you run it twice?
 *
 * WHY THIS MATTERS. Team coverage is 38% of the readiness score, the largest
 * single weight, and it is computed as average coverage across the roles the
 * LLM decided a venture needs. Nothing validates those roles. If the model
 * returns six roles on one run and three on another for the same idea, a solo
 * founder's team score halves for reasons that have nothing to do with their
 * venture.
 *
 * That variance has never been measured. This measures it, before anybody
 * decides whether it needs fixing. Structuring runs at temperature 0.2, so it
 * is not expected to be identical, only stable enough that the score it feeds
 * is not noise.
 *
 * WHAT IT REPORTS, per idea, across N runs:
 *   role count spread      how many roles came back each time
 *   role name agreement    the share of roles that appeared in EVERY run
 *   readiness impact       what the count spread does to team coverage for a
 *                          solo founder, expressed in points of final score
 *
 * The last one is the number that matters. A wobble in role names is
 * cosmetic; a wobble in role COUNT moves the score.
 *
 * Usage:
 *   node scripts/measure-role-variance.js          3 runs over 3 real ideas
 *   node scripts/measure-role-variance.js 5        5 runs
 */
const pool = require('../backend/shared/db');
const { structureIdea } = require('../backend/ai/ideaStructuring');
// The same role matcher the engine uses. Comparing role NAMES with string
// equality counts 'AI/ML Engineer' and 'Machine Learning Engineer' as
// disagreement, which is exactly the mistake the synonym table was built to
// stop, and it made the model look four times less stable than it is.
const { computeRoleFitForTesting: roleFit } = require('../backend/matching/matchingService');
const SAME_JOB = 0.8;   // the same threshold the engine uses to call it evidence

const RUNS = Math.max(2, parseInt(process.argv[2], 10) || 3);
const TEAM_WEIGHT = 0.38;   // must match READINESS_WEIGHTS.team_composition
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

(async () => {
  // Real ideas from real ventures, not invented test input: the point is how
  // the model behaves on the text founders actually write.
  const ideas = (await pool.query(
    `SELECT s.name, s.problem, s.solution
     FROM startups s JOIN users u ON u.id = s.founder_id
     WHERE u.email LIKE '%@seed.test' AND s.problem IS NOT NULL
     ORDER BY length(s.problem) DESC LIMIT 3`
  )).rows;

  if (ideas.length === 0) { console.log('No seeded ventures with a written problem to test against.'); await pool.end(); process.exit(1); }

  console.log(`Running structuring ${RUNS} times over ${ideas.length} real ideas.`);
  console.log(`Roughly ${Math.ceil(ideas.length * RUNS * 8 / 60)} minute(s).\n`);

  const summary = [];

  for (const idea of ideas) {
    const rawIdea = `${idea.problem}\n\n${idea.solution || ''}`.trim();
    console.log(`${idea.name}`);
    const runs = [];

    for (let i = 0; i < RUNS; i++) {
      try {
        const r = await structureIdea(rawIdea);
        if (!r.success) { console.log(`  run ${i + 1}: failed — ${r.error}`); continue; }
        // structureIdea returns { success, data }, not { structured }. Reading
        // the wrong field would have reported zero roles on every run and
        // produced a confident verdict of perfect stability.
        const roles = ((r.data && r.data.role_requirements) || []).map((x) => x.role);
        runs.push(roles);
        console.log(`  run ${i + 1}: ${roles.length} role(s) — ${roles.join(', ')}`);
      } catch (err) {
        console.log(`  run ${i + 1}: threw — ${err.message}`);
      }
      await sleep(6000); // the free tier needs room between calls
    }

    if (runs.length < 2) { console.log('  not enough successful runs to compare\n'); continue; }

    const counts = runs.map((r) => r.length);
    const minCount = Math.min(...counts), maxCount = Math.max(...counts);

    // A role is stable if EVERY run asked for that job, by any name. Two runs
    // wanting an 'AI/ML Engineer' and a 'Machine Learning Engineer' agree.
    const sameJob = (a, b) => norm(a) === norm(b) || roleFit(a, b) >= SAME_JOB;
    const distinct = [];
    for (const role of runs.flat()) {
      if (!distinct.some((d) => sameJob(d, role))) distinct.push(role);
    }
    const everywhere = distinct.filter((role) => runs.every((r) => r.some((x) => sameJob(x, role))));
    const agreement = distinct.length === 0 ? 1 : everywhere.length / distinct.length;

    // What the count spread does to a solo founder's score. With no roles
    // covered, team coverage is 0 either way, so the honest test is a founder
    // who covers exactly ONE role: their coverage is 1/n, and n is what moves.
    const bestCase = 1 / minCount;
    const worstCase = 1 / maxCount;
    const pointSwing = (bestCase - worstCase) * TEAM_WEIGHT * 100;

    console.log(`  role count: ${minCount} to ${maxCount}`);
    console.log(`  agreement:  ${Math.round(agreement * 100)}% of roles were asked for in every run`);
    if (everywhere.length) console.log(`              stable: ${everywhere.join(', ')}`);
    console.log(`  score impact: ${pointSwing.toFixed(1)} points of final readiness, for a founder covering one role\n`);

    summary.push({ name: idea.name, minCount, maxCount, agreement, pointSwing });
  }

  if (summary.length === 0) { await pool.end(); process.exit(1); }

  const avgAgreement = summary.reduce((a, s) => a + s.agreement, 0) / summary.length;
  const worstSwing = Math.max(...summary.map((s) => s.pointSwing));

  console.log('='.repeat(64));
  console.log(`Average role agreement across runs: ${Math.round(avgAgreement * 100)}%`);
  console.log(`Worst readiness swing from run-to-run variance: ${worstSwing.toFixed(1)} points\n`);

  // A verdict, so the measurement produces a decision rather than numbers.
  if (worstSwing < 3 && avgAgreement >= 0.7) {
    console.log('VERDICT: stable enough. Role diagnosis varies, but not by enough');
    console.log('to move the readiness score meaningfully. No fix needed.');
  } else if (worstSwing < 8) {
    console.log('VERDICT: some drift. The score moves by a few points on identical');
    console.log('input. Worth knowing, probably not worth fixing before other work.');
  } else {
    console.log('VERDICT: too unstable. The same idea produces materially different');
    console.log('readiness scores, which means team composition, the heaviest weight');
    console.log('in the score, is partly noise. Worth fixing: either pin the role');
    console.log('count, lower the temperature, or diagnose roles once and reuse them.');
  }

  await pool.end();
  process.exit(0);
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
