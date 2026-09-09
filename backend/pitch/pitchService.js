/**
 * Phase 5: Pitch Mode.
 *
 * This is purely a presentation layer. The hard part (understanding the
 * venture, diagnosing gaps, scoring readiness) is already done and proven.
 * Nothing here invents new facts about a venture: every number and every
 * claim comes from data that already exists.
 *
 * The one thing it does add is narrative ORDER. A dashboard shows everything
 * at once because you are working. A pitch shows one thing at a time because
 * someone is being convinced.
 */
const pool = require('../shared/db');

async function getPitch(startupId, viewerId) {
  const startupRes = await pool.query(
    `SELECT s.*, p.display_name AS founder_name, p.headline AS founder_headline, p.bio AS founder_bio
     FROM startups s
     JOIN profiles p ON p.user_id = s.founder_id
     WHERE s.id = $1`,
    [startupId]
  );
  if (startupRes.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const startup = startupRes.rows[0];

  // Same visibility rule as getStartup, including the co-founder fix: a
  // co-founder who joined at formation is a real owner of this venture.
  let isOwner = startup.founder_id === viewerId;
  if (!isOwner && viewerId) {
    const coFounder = await pool.query(
      `SELECT 1 FROM startup_team_members WHERE startup_id = $1 AND user_id = $2 AND is_founder = true`,
      [startupId, viewerId]
    );
    if (coFounder.rows.length > 0) isOwner = true;
  }
  const isVisible = startup.visibility === 'DISCOVERABLE' && startup.status === 'ACTIVE';
  if (!isOwner && !isVisible) return { success: false, error: 'NOT_FOUND' };

  const [readiness, team, milestones, gaps] = await Promise.all([
    pool.query(
      // NOTE: dimension_justifications is NOT a column. It is computed at
      // runtime by readinessService and never persisted. Verified before
      // shipping rather than assumed, since this is exactly the mistake
      // that broke founder Signal (created_at vs generated_at).
      `SELECT overall_score, dimensions, critical_issues, top_actions, generated_at
       FROM readiness_assessments WHERE startup_id = $1 ORDER BY generated_at DESC LIMIT 1`,
      [startupId]
    ),
    pool.query(
      `SELECT tm.role, tm.skills, tm.is_founder, tm.joined_at, p.display_name, p.headline
       FROM startup_team_members tm
       JOIN profiles p ON p.user_id = tm.user_id
       WHERE tm.startup_id = $1
       ORDER BY tm.is_founder DESC, tm.joined_at ASC`,
      [startupId]
    ),
    pool.query(
      `SELECT title, description, status, sequence_order
       FROM milestones WHERE startup_id = $1 ORDER BY sequence_order ASC LIMIT 6`,
      [startupId]
    ),
    pool.query(
      `SELECT role, priority_level, status FROM gaps WHERE startup_id = $1 AND status != 'DISMISSED'`,
      [startupId]
    ),
  ]);

  // The readiness trajectory is the actual story: not "we scored 58" but
  // "we started at 31 and we are at 58 because people joined". Only real
  // history, never fabricated.
  const history = await pool.query(
    `SELECT overall_score, generated_at FROM readiness_assessments
     WHERE startup_id = $1 ORDER BY generated_at ASC`,
    [startupId]
  );

  const openGaps = gaps.rows.filter(g => g.status !== 'FILLED');
  const filledGaps = gaps.rows.filter(g => g.status === 'FILLED');

  // If this venture began as a spark, that origin is part of the pitch.
  const spark = await pool.query(
    `SELECT title, the_idea, created_at FROM sparks WHERE formed_startup_id = $1 LIMIT 1`,
    [startupId]
  );

  return {
    success: true,
    isOwner,
    pitch: {
      id: startup.id,
      name: startup.name,
      problem: startup.problem,
      solution: startup.solution,
      domain: startup.domain || [],
      stage: startup.stage,
      target_users: startup.target_users || [],
      business_model: startup.business_model || [],
      founder: {
        name: startup.founder_name,
        headline: startup.founder_headline,
        bio: startup.founder_bio,
        vision: startup.founder_vision,
      },
      readiness: readiness.rows[0] || null,
      readiness_history: history.rows,
      team: team.rows,
      milestones: milestones.rows,
      open_gaps: openGaps,
      filled_count: filledGaps.length,
      origin_spark: spark.rows[0] || null,
    },
  };
}

module.exports = { getPitch };
