require('dotenv').config();
/**
 * Expire recommendations pointing at roles that are no longer open.
 *
 * A recommendation is a claim that somebody should look at a specific open
 * role. When the role is filled or dismissed, the claim is false, and showing
 * it wastes the time of the one person who acted on it.
 *
 * This existed only inside the admin panel's repair tools, so anything that
 * filled a gap outside that path left the claims behind. The seeding script
 * that added teams to ten ventures did exactly that and left 65 of them.
 * Both now do the cleanup at the point of filling; this clears what is
 * already there.
 *
 * Usage: node scripts/expire-stale-recommendations.js
 */
const pool = require('../backend/shared/db');

(async () => {
  const before = await pool.query(
    `SELECT COUNT(*)::int AS n
     FROM recommendations r JOIN gaps g ON g.id = r.source_gap_id
     WHERE r.status = 'ACTIVE' AND g.status IN ('FILLED', 'DISMISSED')`
  );
  console.log(`${before.rows[0].n} recommendation(s) point at a role that is no longer open.`);

  if (before.rows[0].n === 0) { await pool.end(); process.exit(0); }

  const r = await pool.query(
    `UPDATE recommendations SET status = 'EXPIRED'
     WHERE id IN (
       SELECT r.id FROM recommendations r JOIN gaps g ON g.id = r.source_gap_id
       WHERE r.status = 'ACTIVE' AND g.status IN ('FILLED', 'DISMISSED')
     ) RETURNING id`
  );
  console.log(`Expired ${r.rows.length}.`);
  console.log('\nNEXT: node scripts/test-matching-quality.js');
  await pool.end();
  process.exit(0);
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
