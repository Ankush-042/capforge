/**
 * Phase 3 backfill: generate vision and motivation embeddings for everyone
 * who already wrote the text before this feature existed.
 *
 * Without this, vision alignment would only work for accounts created after
 * migration 023, and every existing venture would silently fall back to
 * logistics-only co-founder scoring.
 */
require('dotenv').config();
const pool = require('../backend/shared/db');
const { refreshVisionEmbedding, refreshMotivationEmbedding } = require('../backend/matching/visionAlignmentService');

(async () => {
  const startups = await pool.query(
    `SELECT id, name FROM startups
     WHERE founder_vision IS NOT NULL AND length(trim(founder_vision)) >= 20 AND vision_embedding IS NULL`
  );
  console.log(`Ventures needing a vision embedding: ${startups.rows.length}`);
  let sOk = 0;
  for (const s of startups.rows) {
    const r = await refreshVisionEmbedding(s.id);
    console.log(`  ${r.success ? 'OK  ' : 'SKIP'} ${s.name}${r.success ? '' : ` (${r.reason})`}`);
    if (r.success) sOk++;
  }

  const contributors = await pool.query(
    `SELECT p.user_id, p.display_name FROM contributor_profiles cp
     JOIN profiles p ON p.id = cp.profile_id
     WHERE cp.looking_for IS NOT NULL AND length(trim(cp.looking_for)) >= 20 AND cp.motivation_embedding IS NULL`
  );
  console.log(`\nContributors needing a motivation embedding: ${contributors.rows.length}`);
  let cOk = 0;
  for (const c of contributors.rows) {
    const r = await refreshMotivationEmbedding(c.user_id);
    console.log(`  ${r.success ? 'OK  ' : 'SKIP'} ${c.display_name}${r.success ? '' : ` (${r.reason})`}`);
    if (r.success) cOk++;
  }

  console.log(`\nDone. ${sOk}/${startups.rows.length} ventures, ${cOk}/${contributors.rows.length} contributors.`);
  await pool.end();
})();
