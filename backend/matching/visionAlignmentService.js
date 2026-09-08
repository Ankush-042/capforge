/**
 * Phase 3: Vision-Driven Co-Founder Matching.
 *
 * The confirmed gap, verified by direct inspection rather than assumed:
 * co-founder matching already differs from job matching (weights differ,
 * compatibilityFit is a real 25% signal for CO_FOUNDER gaps). But
 * compatibilityFit measures availability and equity-mindedness, which are
 * LOGISTICS. Nothing anywhere measures whether two people want to build the
 * same thing for compatible reasons.
 *
 * founder_vision and looking_for already exist, are already collected, and
 * were used in exactly zero scoring paths. This module makes them matter.
 *
 * Scope is deliberately narrow: this signal applies ONLY to CO_FOUNDER gaps.
 * CORE_HIRE, CONTRACTOR and ADVISOR scoring is untouched, because that path
 * is proven and tested and reopening it would risk a working system.
 */
const pool = require('../shared/db');

/**
 * Generate and store the vision embedding for a venture, from the founder's
 * own stated reason for building it. Fire-and-forget by design: this must
 * never block a save, and a missing embedding degrades cleanly to "no
 * alignment signal" rather than to a zero score.
 */
async function refreshVisionEmbedding(startupId) {
  const result = await pool.query(`SELECT founder_vision FROM startups WHERE id = $1`, [startupId]);
  const vision = result.rows[0]?.founder_vision;
  if (!vision || vision.trim().length < 20) return { success: false, reason: 'NO_VISION_TEXT' };

  try {
    const { generateEmbedding } = require('../shared/embeddings');
    const embedding = await generateEmbedding(vision.trim());
    if (!embedding) return { success: false, reason: 'EMBEDDING_UNAVAILABLE' };
    await pool.query(`UPDATE startups SET vision_embedding = $1 WHERE id = $2`, [JSON.stringify(embedding), startupId]);
    return { success: true };
  } catch (err) {
    console.error('Vision embedding failed (non-fatal):', err.message);
    return { success: false, reason: 'ERROR' };
  }
}

/**
 * Same, for a contributor's stated reason for wanting to build something.
 */
async function refreshMotivationEmbedding(userId) {
  const result = await pool.query(
    `SELECT cp.id, cp.looking_for FROM contributor_profiles cp
     JOIN profiles p ON p.id = cp.profile_id WHERE p.user_id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row?.looking_for || row.looking_for.trim().length < 20) return { success: false, reason: 'NO_MOTIVATION_TEXT' };

  try {
    const { generateEmbedding } = require('../shared/embeddings');
    const embedding = await generateEmbedding(row.looking_for.trim());
    if (!embedding) return { success: false, reason: 'EMBEDDING_UNAVAILABLE' };
    await pool.query(`UPDATE contributor_profiles SET motivation_embedding = $1 WHERE id = $2`, [JSON.stringify(embedding), row.id]);
    return { success: true };
  } catch (err) {
    console.error('Motivation embedding failed (non-fatal):', err.message);
    return { success: false, reason: 'ERROR' };
  }
}

/**
 * The real signal: cosine similarity between why this founder is building
 * this, and why this person wants to build something.
 *
 * Returns null (not zero) when either side has no vision text yet. This
 * distinction matters: null means "no signal, fall back to the proven
 * scoring", while zero would mean "actively misaligned" and would unfairly
 * punish everyone who has not written a vision statement.
 */
async function getVisionAlignment(startupId, candidateUserIds) {
  if (!candidateUserIds || candidateUserIds.length === 0) return {};

  const result = await pool.query(
    `SELECT p.user_id,
            1 - (s.vision_embedding <=> cp.motivation_embedding) AS alignment
     FROM startups s
     CROSS JOIN contributor_profiles cp
     JOIN profiles p ON p.id = cp.profile_id
     WHERE s.id = $1
       AND p.user_id = ANY($2::uuid[])
       AND s.vision_embedding IS NOT NULL
       AND cp.motivation_embedding IS NOT NULL`,
    [startupId, candidateUserIds]
  );

  const map = {};
  for (const row of result.rows) {
    // Cosine similarity in pgvector runs -1..1; clamp to 0..1 so it composes
    // with every other score component in the existing engine.
    map[row.user_id] = Math.max(0, Math.min(1, parseFloat(row.alignment)));
  }
  return map;
}

/**
 * Human-readable explanation. Never invents a reason that is not backed by a
 * real computed number, matching the existing explainScore contract.
 */
function explainVisionAlignment(alignment) {
  if (alignment === null || alignment === undefined) return null;
  if (alignment >= 0.75) return 'Strong alignment between why you are building this and what they say they are looking for.';
  if (alignment >= 0.55) return 'Real overlap between your stated vision and their stated motivation.';
  if (alignment >= 0.35) return 'Some common ground in what you each say you want to build.';
  return 'Your stated vision and their stated motivation point in noticeably different directions.';
}

module.exports = { refreshVisionEmbedding, refreshMotivationEmbedding, getVisionAlignment, explainVisionAlignment };
