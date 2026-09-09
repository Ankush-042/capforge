require('dotenv').config();
/**
 * Re-rank every open gap with the fixed matching engine.
 *
 * Necessary after the fixes because recommendations are PRE-COMPUTED and
 * stored. Without this, every existing row still carries the old scores and
 * the old false-positive explanations.
 */
const pool = require('../backend/shared/db');
const { rankCandidatesForGap } = require('../backend/matching/matchingService');

(async () => {
  const gaps = await pool.query(
    `SELECT g.id, g.role, s.name AS startup
     FROM gaps g
     JOIN startups s ON s.id = g.startup_id
     JOIN users u ON u.id = s.founder_id
     WHERE g.status NOT IN ('FILLED','DISMISSED')
       AND u.email != 'system.import@capforge.internal'
       AND s.verification_status != 'UNVERIFIED'
     ORDER BY s.name, g.role`
  );

  console.log(`Re-ranking ${gaps.rows.length} open gaps with the fixed engine...\n`);
  let ok = 0, failed = 0;
  for (const g of gaps.rows) {
    try {
      const r = await rankCandidatesForGap(g.id);
      const n = r.recommendations ? r.recommendations.length : 0;
      console.log(`  OK   ${g.startup} — ${g.role}: ${n} candidate${n === 1 ? '' : 's'}`);
      ok++;
    } catch (err) {
      console.log(`  FAIL ${g.startup} — ${g.role}: ${err.message}`);
      failed++;
    }
  }
  console.log(`\nDone. ${ok} re-ranked, ${failed} failed.`);
  await pool.end();
  process.exit(0);
})();
