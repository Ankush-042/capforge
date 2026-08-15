/**
 * AI-16 — Feedback / Re-ranking Engine.
 * Ref: AI/Intelligence spec §49-52, TRD §35, architecture doc §61-62.
 *
 * NON-NEGOTIABLE (AI spec §50, explicit in the spec text): "the system
 * must avoid allowing feedback to completely destroy relevance... a
 * user's one rejection should not eliminate an entire category."
 * Enforced here via a hard-bounded adjustment range, not a soft guideline.
 */
const pool = require('../shared/db');

const ACTION_WEIGHTS = {
  VIEW: 0.01, SAVE: 0.05, INTEREST: 0.08, CONNECT: 0.15,
  DISMISS: -0.05, REJECT: -0.10
};

const ADJUSTMENT_BOUND = 0.30; // hard cap, either direction — the actual enforcement of the non-negotiable rule above

/**
 * Determines who is authorized to give feedback on a recommendation.
 * For CONTRIBUTOR-type recs (a candidate suggested to a founder), the
 * FOUNDER is the actor reacting to the suggestion — target_user_id is
 * the candidate being suggested, not the person judging the suggestion.
 * For STARTUP-type recs (a venture suggested to an investor), the
 * investor IS target_user_id and acts on their own recommendation.
 */
async function getAuthorizedActor(recommendation) {
  if (recommendation.recommendation_type === 'CONTRIBUTOR') {
    const r = await pool.query('SELECT founder_id FROM startups WHERE id = $1', [recommendation.startup_id]);
    return r.rows[0]?.founder_id;
  }
  return recommendation.target_user_id; // STARTUP type: investor acts on their own feed
}

async function recordFeedback(actingUserId, recommendationId, action) {
  const actionUpper = (action || '').toUpperCase();
  if (!(actionUpper in ACTION_WEIGHTS)) {
    return { success: false, error: 'INVALID_ACTION', detail: `Must be one of: ${Object.keys(ACTION_WEIGHTS).join(', ')}` };
  }

  const recResult = await pool.query('SELECT * FROM recommendations WHERE id = $1', [recommendationId]);
  if (recResult.rows.length === 0) return { success: false, error: 'RECOMMENDATION_NOT_FOUND' };
  const recommendation = recResult.rows[0];

  const authorizedActor = await getAuthorizedActor(recommendation);
  if (authorizedActor !== actingUserId) {
    return { success: false, error: 'NOT_AUTHORIZED' };
  }

  await pool.query(
    `INSERT INTO recommendation_feedback (recommendation_id, user_id, action) VALUES ($1, $2, $3)`,
    [recommendationId, actingUserId, actionUpper]
  );

  // Update bounded preference signals. v1 scope (documented, consistent
  // with AI spec §61's "lightweight feedback weighting is sufficient"):
  // signals keyed on the recommended startup's stage and domain — the
  // dimensions actually available on every recommendation type without
  // requiring a richer signal taxonomy this sprint.
  const startupResult = await pool.query('SELECT stage, domain FROM startups WHERE id = $1', [recommendation.startup_id]);
  const startup = startupResult.rows[0];
  const weight = ACTION_WEIGHTS[actionUpper];

  const signalKeys = [];
  if (startup?.stage) signalKeys.push(`stage:${startup.stage.toLowerCase()}`);
  for (const d of startup?.domain || []) signalKeys.push(`domain:${d.toLowerCase()}`);

  const updatedSignals = [];
  for (const key of signalKeys) {
    const upserted = await pool.query(
      `INSERT INTO user_preference_signals (user_id, signal_key, adjustment)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, signal_key) DO UPDATE SET
         adjustment = GREATEST(LEAST(user_preference_signals.adjustment + $3, $4), -$4),
         updated_at = now()
       RETURNING *`,
      [actingUserId, key, weight, ADJUSTMENT_BOUND]
    );
    updatedSignals.push(upserted.rows[0]);
  }

  return { success: true, feedback: { recommendation_id: recommendationId, action: actionUpper }, updated_signals: updatedSignals };
}

/**
 * Fetches a user's combined preference adjustment for a given set of
 * signal keys (e.g. this candidate's relevant stage/domain). Summed
 * and re-bounded — so even several matching signals can't runaway
 * past the same hard cap.
 */
async function getPreferenceAdjustment(userId, signalKeys) {
  if (!signalKeys || signalKeys.length === 0) return 0;
  const result = await pool.query(
    `SELECT COALESCE(SUM(adjustment), 0) as total FROM user_preference_signals WHERE user_id = $1 AND signal_key = ANY($2::text[])`,
    [userId, signalKeys]
  );
  const total = parseFloat(result.rows[0].total);
  return Math.max(Math.min(total, ADJUSTMENT_BOUND), -ADJUSTMENT_BOUND);
}

module.exports = { recordFeedback, getPreferenceAdjustment, ACTION_WEIGHTS, ADJUSTMENT_BOUND };
