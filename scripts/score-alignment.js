require('dotenv').config();
/**
 * Score every (contributor, venture) pair for real alignment, using the LLM.
 *
 * Built to survive rate limits rather than hope to avoid them:
 *   - Every score is written the instant it is computed. Hitting a limit at
 *     pair 300 keeps all 300. Re-run and it resumes at 301.
 *   - Throttled between calls to stay under per-minute limits.
 *   - Priority ordered: pairs where BOTH sides wrote real text are scored
 *     first, so partial completion still delivers most of the value.
 *   - Stops cleanly after repeated failures rather than burning through
 *     hundreds of doomed calls.
 *
 * Usage:
 *   node scripts/score-alignment.js            resume, skip already-scored
 *   node scripts/score-alignment.js --force    rescore everything
 */
const pool = require('../backend/shared/db');
const { scorePair } = require('../backend/matching/alignmentService');

const DELAY_MS = 350;           // stay comfortably under per-minute limits
const MAX_CONSECUTIVE_FAILS = 8; // stop rather than hammer a dead endpoint

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const force = process.argv.includes('--force');

  // Only pairs where both sides actually wrote something. A pair with no
  // mission or no vision has nothing to judge, and asking the LLM to score
  // empty text would produce a confident meaningless number.
  const pairs = await pool.query(
    `SELECT p.user_id, cp.looking_for AS mission, cp.preferred_domains, p.headline,
            s.id AS startup_id, s.name AS startup_name, s.founder_vision AS vision,
            s.problem, s.domain AS venture_domains
     FROM contributor_profiles cp
     JOIN profiles p ON p.id = cp.profile_id
     JOIN users u ON u.id = p.user_id
     CROSS JOIN startups s
     JOIN users fu ON fu.id = s.founder_id
     WHERE cp.looking_for IS NOT NULL AND length(trim(cp.looking_for)) >= 20
       AND s.founder_vision IS NOT NULL AND length(trim(s.founder_vision)) >= 20
       AND fu.email != 'system.import@capforge.internal'
       AND s.verification_status != 'UNVERIFIED'
       ${force ? '' : `AND NOT EXISTS (
         SELECT 1 FROM alignment_scores a
         WHERE a.user_id = p.user_id AND a.startup_id = s.id
       )`}
     ORDER BY p.display_name, s.name`
  );

  const total = pairs.rows.length;
  console.log(`${force ? 'FORCE: rescoring' : 'Scoring'} ${total} pair(s).`);
  if (total === 0) { console.log('Nothing to do. All pairs already scored.'); await pool.end(); process.exit(0); }
  console.log(`Estimated time: about ${Math.ceil(total * (DELAY_MS + 700) / 60000)} minute(s).\n`);

  let done = 0, failed = 0, consecutiveFails = 0;

  for (const row of pairs.rows) {
    const result = await scorePair({
      userId: row.user_id,
      startupId: row.startup_id,
      mission: row.mission,
      vision: row.vision,
      problem: row.problem,
      ventureDomains: row.venture_domains,
      domains: row.preferred_domains,
      headline: row.headline,
    });

    if (result) {
      done++;
      consecutiveFails = 0;
      const pct = Math.round(result.score * 100);
      if (done % 25 === 0 || pct >= 70 || pct <= 15) {
        console.log(`  [${done + failed}/${total}] ${pct}%  ${row.headline || 'contributor'} -> ${row.startup_name}`);
        if (pct >= 70 || pct <= 15) console.log(`             "${result.reason}"`);
      }
    } else {
      failed++;
      consecutiveFails++;
      console.log(`  [${done + failed}/${total}] FAILED  -> ${row.startup_name}`);
      if (consecutiveFails >= MAX_CONSECUTIVE_FAILS) {
        console.log(`\nStopped after ${MAX_CONSECUTIVE_FAILS} consecutive failures (likely a rate limit or bad key).`);
        console.log(`${done} scores are saved. Re-run this script later and it resumes from here.`);
        break;
      }
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Scored: ${done}   Failed: ${failed}   Of: ${total}`);
  if (failed > 0) console.log(`Re-run to retry the failures. Nothing already done is lost.`);
  console.log(`\nNEXT: node scripts/rerank-everything.js`);
  await pool.end();
  process.exit(0);
})();
