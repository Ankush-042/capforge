/**
 * Trust & Verification (Sprint 22). Ref: PRD §31, SRS §65.
 * Real state machine: CLAIMED (default, founder-created) ->
 * PENDING_VERIFICATION (founder requests) -> VERIFIED (admin approves).
 */
const pool = require('../shared/db');

async function requestVerification(startupId, founderId) {
  const result = await pool.query(
    `UPDATE startups SET verification_status = 'PENDING_VERIFICATION', updated_at = now()
     WHERE id = $1 AND founder_id = $2 AND verification_status = 'CLAIMED' RETURNING *`,
    [startupId, founderId]
  );
  if (result.rows.length === 0) return { success: false, error: 'NOT_ELIGIBLE', detail: 'Startup must be CLAIMED and owned by you to request verification.' };
  return { success: true, startup: result.rows[0] };
}

async function getVerificationStatus(startupId) {
  const result = await pool.query('SELECT verification_status FROM startups WHERE id = $1', [startupId]);
  if (result.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  return { success: true, verification_status: result.rows[0].verification_status };
}

module.exports = { requestVerification, getVerificationStatus };
