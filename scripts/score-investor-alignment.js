require('dotenv').config();
/**
 * Score every investor's thesis against every venture.
 *
 * One call per INVESTOR, not per pair, for the same reason the contributor
 * version batches: per-pair was 528 calls there and would be roughly 90 here.
 * Batching also produces better relative scoring, because the model sees the
 * whole set rather than judging each venture blind.
 *
 * Usage:
 *   node scripts/score-investor-alignment.js          score whoever is unscored
 *   node scripts/score-investor-alignment.js --force  rescore everyone
 */
const pool = require('../backend/shared/db');
const { scoreInvestorAgainstVentures } = require('../backend/matching/alignmentService');

const DELAY_MS = 5000; // tokens/minute is the binding limit, not requests
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const force = process.argv.includes('--force');

  const ventures = (await pool.query(
    `SELECT s.id, s.name, s.domain, s.stage, s.problem, s.founder_vision
     FROM startups s JOIN users u ON u.id = s.founder_id
     WHERE s.founder_vision IS NOT NULL AND length(trim(s.founder_vision)) >= 20
       AND u.email != 'system.import@capforge.internal'
       AND s.verification_status != 'UNVERIFIED'
     ORDER BY s.name`
  )).rows;

  const investors = (await pool.query(
    `SELECT p.user_id, p.display_name, ip.thesis, ip.preferred_domains, ip.preferred_stages
     FROM investor_profiles ip
     JOIN profiles p ON p.id = ip.profile_id
     WHERE ip.thesis IS NOT NULL AND length(trim(ip.thesis)) >= 20
       ${force ? '' : `AND (
         SELECT COUNT(*) FROM alignment_scores a WHERE a.user_id = p.user_id
       ) < ${ventures.length}`}
     ORDER BY p.display_name`
  )).rows;

  console.log(`${ventures.length} ventures, ${investors.length} investor(s) to score.`);
  if (investors.length === 0) { console.log('Nothing to do.'); await pool.end(); process.exit(0); }
  console.log(`About ${Math.ceil(investors.length * 6 / 60)} minute(s).\n`);

  let ok = 0, failed = 0;
  for (const inv of investors) {
    const r = await scoreInvestorAgainstVentures({
      userId: inv.user_id, thesis: inv.thesis,
      domains: inv.preferred_domains, stages: inv.preferred_stages, ventures,
    });

    if (r.failed) {
      failed++;
      console.log(`  FAIL  ${inv.display_name}: ${r.reason}${r.detail ? ` — ${String(r.detail).slice(0, 120)}` : ''}`);
    } else {
      ok++;
      const sorted = [...r.saved].sort((a, b) => b.score - a.score);
      console.log(`  OK    ${inv.display_name} — ${r.saved.length}/${r.expected} scored`);
      if (sorted[0]) console.log(`        best:  ${Math.round(sorted[0].score * 100)}% ${sorted[0].startup} — "${sorted[0].reason}"`);
      if (sorted[sorted.length - 1]) console.log(`        worst: ${Math.round(sorted[sorted.length - 1].score * 100)}% ${sorted[sorted.length - 1].startup}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Scored: ${ok}   Failed: ${failed}`);
  if (failed > 0) console.log('Re-run to retry. Nothing already saved is lost.');
  console.log('\nNEXT: refresh investor deal flow from the app, or wait for the next refresh.');
  await pool.end();
  process.exit(0);
})();
