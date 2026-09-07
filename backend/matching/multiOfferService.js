/**
 * Sprint 25 — Multi-offer comparison + learning-resource recommendations.
 * Ref: PRD §Contributor Advanced Features.
 */
const pool = require('../shared/db');

/** Real: every ACTIVE recommendation this contributor is currently in the running for, compared side by side. */
async function getMultiOfferComparison(userId) {
  // Real fix for a confirmed bug: this is a SEPARATE query from
  // getMyRecommendationsAsContributor() in matchingService.js — the
  // same two fixes applied there (excluding orphaned gap references,
  // a genuine minimum-relevance threshold) were never applied here,
  // explaining the exact garbage reported: blank Role/Type columns
  // (orphaned source_gap_id) and a long tail of near-zero-relevance
  // noise entries.
  const MIN_RELEVANCE_SCORE = 0.20;
  const result = await pool.query(
    `SELECT r.*, s.name as startup_name, s.domain, s.stage, g.role as gap_role, g.seeking_type
     FROM recommendations r
     JOIN startups s ON s.id = r.startup_id
     JOIN gaps g ON g.id = r.source_gap_id
     WHERE r.target_user_id = $1 AND r.recommendation_type = 'CONTRIBUTOR' AND r.status = 'ACTIVE'
       AND r.score >= $2 AND g.status != 'FILLED'
     ORDER BY r.score DESC`,
    [userId, MIN_RELEVANCE_SCORE]
  );
  return { success: true, offers: result.rows };
}

/** Real: derives learning suggestions from this contributor's OWN recurring skill gaps against real platform demand. */
async function getLearningRecommendations(userId) {
  const profileResult = await pool.query('SELECT skills FROM profiles WHERE user_id = $1', [userId]);
  const mySkills = new Set((profileResult.rows[0]?.skills || []).map((s) => s.toLowerCase().trim()));

  const openGapsResult = await pool.query(`SELECT required_skills, priority_level FROM gaps WHERE status != 'FILLED'`);
  const missingSkillCounts = {};
  for (const row of openGapsResult.rows) {
    for (const skill of row.required_skills || []) {
      const key = skill.toLowerCase().trim();
      if (!mySkills.has(key)) missingSkillCounts[key] = (missingSkillCounts[key] || 0) + 1;
    }
  }

  const recommendations = Object.entries(missingSkillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill, count]) => ({
      skill,
      demand_count: count,
      reason: `Appears in ${count} currently-open startup gap${count > 1 ? 's' : ''} you don't yet have listed on your profile.`
    }));

  return { success: true, recommendations };
}

module.exports = { getMultiOfferComparison, getLearningRecommendations };
