/**
 * Real cleanup for existing recommendations created before the
 * genuine-signal filter existed — this fix only affects FUTURE
 * rankings; noise already in the database needs a real one-time sweep.
 *
 * Real logic mirrors the exact filter now applied at creation time:
 * a recommendation with zero real skill overlap AND zero real domain
 * overlap AND no meaningful semantic similarity is noise, regardless
 * of what nonzero baseline score it was stored with.
 *
 * Run: node scripts/cleanup-noise-recommendations.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const result = await pool.query(`SELECT r.id, r.score_breakdown FROM recommendations r WHERE r.recommendation_type = 'CONTRIBUTOR' AND r.status = 'ACTIVE'`);
  let expiredCount = 0;

  for (const row of result.rows) {
    const breakdown = typeof row.score_breakdown === 'string' ? JSON.parse(row.score_breakdown) : row.score_breakdown;
    if (!breakdown) continue;
    const hasRealSkillOverlap = (breakdown.skillFit || 0) > 0.05; // a nonzero deterministic overlap component
    const hasRealDomainOverlap = (breakdown.domainFit || 0) > 0.05;
    const hasRealSemantic = breakdown.semanticSimilarity !== null && breakdown.semanticSimilarity !== undefined && breakdown.semanticSimilarity >= 0.5;
    if (!hasRealSkillOverlap && !hasRealDomainOverlap && !hasRealSemantic) {
      await pool.query(`UPDATE recommendations SET status = 'EXPIRED' WHERE id = $1`, [row.id]);
      expiredCount++;
    }
  }

  console.log(`Expired ${expiredCount} of ${result.rows.length} existing recommendations that had zero genuine matching signal.`);
  await pool.end();
}
run();
