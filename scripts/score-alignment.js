require('dotenv').config();
/**
 * Score every contributor's alignment against every venture.
 *
 * ONE CALL PER CONTRIBUTOR, not one per pair. 38 calls instead of 528.
 * Roughly two minutes rather than half an hour.
 *
 * The first version made 528 separate calls with max_tokens 200, which
 * truncated the JSON mid-sentence on nearly every response. Most of what
 * looked like rate limiting was actually my own token limit, and retrying a
 * deterministic truncation with backoff just burned a minute reproducing it.
 *
 * Usage:
 *   node scripts/score-alignment.js            skip contributors already scored
 *   node scripts/score-alignment.js --force    rescore everyone
 */
const pool = require('../backend/shared/db');
const { scoreContributorAgainstVentures } = require('../backend/matching/alignmentService');

// The binding limit is tokens per minute, not requests per minute. Each
// call now carries 14 ventures of text, so the prompt is large and 1.5s
// between calls exhausted all three keys on 8 of 38 contributors. 5s keeps
// the token rate under the cap.
const DELAY_MS = 5000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const force = process.argv.includes('--force');

  const ventures = (await pool.query(
    `SELECT s.id, s.name, s.domain, s.problem, s.founder_vision
     FROM startups s JOIN users u ON u.id = s.founder_id
     WHERE s.founder_vision IS NOT NULL AND length(trim(s.founder_vision)) >= 20
       AND u.email != 'system.import@capforge.internal'
       AND s.verification_status != 'UNVERIFIED'
     ORDER BY s.name`
  )).rows;

  const contributors = (await pool.query(
    `SELECT p.user_id, p.display_name, p.headline, cp.looking_for AS mission, cp.preferred_domains
     FROM contributor_profiles cp
     JOIN profiles p ON p.id = cp.profile_id
     JOIN users u ON u.id = p.user_id
     WHERE cp.looking_for IS NOT NULL AND length(trim(cp.looking_for)) >= 20
       ${force ? '' : `AND (
         SELECT COUNT(*) FROM alignment_scores a WHERE a.user_id = p.user_id
       ) < ${ventures.length}`}
     ORDER BY p.display_name`
  )).rows;

  console.log(`${ventures.length} ventures, ${contributors.length} contributor(s) to score.`);
  if (contributors.length === 0) { console.log('Nothing to do.'); await pool.end(); process.exit(0); }
  console.log(`About ${Math.ceil(contributors.length * 4 / 60)} minute(s).\n`);

  let ok = 0, failed = 0;
  for (const c of contributors) {
    const r = await scoreContributorAgainstVentures({
      userId: c.user_id, mission: c.mission, headline: c.headline,
      domains: c.preferred_domains, ventures,
    });

    if (r.failed) {
      failed++;
      console.log(`  FAIL  ${c.display_name}: ${r.reason}${r.detail ? ` — ${String(r.detail).slice(0, 120)}` : ''}`);
    } else {
      ok++;
      const top = r.saved.sort((a, b) => b.score - a.score)[0];
      const bottom = r.saved.sort((a, b) => a.score - b.score)[0];
      console.log(`  OK    ${c.display_name} (${c.headline || 'no role'}) — ${r.saved.length}/${r.expected} scored`);
      if (top) console.log(`        best:  ${Math.round(top.score * 100)}% ${top.startup} — "${top.reason}"`);
      if (bottom) console.log(`        worst: ${Math.round(bottom.score * 100)}% ${bottom.startup}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Scored: ${ok}   Failed: ${failed}`);
  if (failed > 0) console.log(`Re-run to retry the failures. Nothing already saved is lost.`);
  console.log(`\nNEXT: node scripts/rerank-everything.js`);
  await pool.end();
  process.exit(0);
})();
