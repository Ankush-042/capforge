require('dotenv').config();
/**
 * Recompute every venture's readiness with the rebuilt engine.
 *
 * Every stored score was produced by the old one: weights chosen by judgement
 * with nothing behind them, a dimension called "market positioning" that
 * awarded 0.7 for two fields the AI fills automatically, and a fabricated 0.5
 * for team coverage when no roles had been diagnosed.
 *
 * Scores will MOVE, and mostly downward, because ventures are no longer paid
 * for the product having run. That is the point of the change, and it is
 * visible rather than quiet: this prints the before and after for each one.
 *
 * Usage:
 *   node scripts/recompute-readiness.js --dry
 *   node scripts/recompute-readiness.js
 */
const pool = require('../backend/shared/db');
const { runReadinessAndRiskAnalysis } = require('../backend/readiness/readinessService');

const DRY = process.argv.includes('--dry');

(async () => {
  const ventures = (await pool.query(
    `SELECT s.id, s.name,
            (SELECT overall_score FROM readiness_assessments ra
             WHERE ra.startup_id = s.id ORDER BY ra.generated_at DESC LIMIT 1) AS current
     FROM startups s
     JOIN users u ON u.id = s.founder_id
     WHERE s.verification_status != 'UNVERIFIED'
     ORDER BY s.name`
  )).rows;

  console.log(`${ventures.length} venture(s)${DRY ? ' — dry run, nothing written' : ''}\n`);
  console.log('  before   after   venture');
  console.log('  ' + '-'.repeat(62));

  let moved = 0, failed = 0;
  const deltas = [];

  for (const v of ventures) {
    const before = v.current !== null ? Math.round(parseFloat(v.current)) : null;
    if (DRY) {
      console.log(`  ${String(before ?? '-').padStart(6)}   ${'?'.padStart(5)}   ${v.name}`);
      continue;
    }
    try {
      const r = await runReadinessAndRiskAnalysis(v.id);
      if (!r.success) { console.log(`  FAILED ${v.name}: ${r.error}`); failed++; continue; }
      const after = r.readiness.overall_score;
      const delta = before === null ? null : after - before;
      if (delta !== null) deltas.push(delta);
      console.log(`  ${String(before ?? '-').padStart(6)}   ${String(after).padStart(5)}   ${v.name}${delta !== null && delta !== 0 ? `   (${delta > 0 ? '+' : ''}${delta})` : ''}`);
      moved++;
    } catch (err) {
      console.log(`  FAILED ${v.name}: ${err.message}`);
      failed++;
    }
  }

  if (!DRY && deltas.length) {
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    console.log(`\n  ${moved} recomputed, ${failed} failed. Average change ${avg > 0 ? '+' : ''}${avg.toFixed(1)} points.`);

    const spread = (await pool.query(
      `WITH latest AS (SELECT DISTINCT ON (startup_id) startup_id, overall_score
                       FROM readiness_assessments ORDER BY startup_id, generated_at DESC)
       SELECT MIN(overall_score)::int AS lo, MAX(overall_score)::int AS hi,
              ROUND(AVG(overall_score))::int AS avg FROM latest`
    )).rows[0];
    console.log(`  Scores now run from ${spread.lo} to ${spread.hi}, averaging ${spread.avg}.`);
    console.log('\nNEXT: node scripts/test-matching-quality.js');
  }

  await pool.end();
  process.exit(0);
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
