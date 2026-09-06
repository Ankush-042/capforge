const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../auth/authMiddleware');
const { getMyProfile, updateBaseProfile, upsertContributorProfile, upsertInvestorProfile } = require('./profileService');
const { getOpenGapIds } = require('../gaps/gapDiagnosisService');
const pool = require('../shared/db');
const { rankCandidatesForGap } = require('../matching/matchingService');

/**
 * Sprint 26 auto-refresh trigger, contributor side: re-scans every
 * currently open gap platform-wide so a newly-completed profile gets
 * real recommendations immediately, matching how real platforms
 * (Wellfound, Indeed) work — completing your profile is itself the
 * trigger, not waiting for someone else to act first.
 */
async function refreshOpenGapRankings() {
  const gapIds = await getOpenGapIds();
  let succeeded = 0;
  for (const gapId of gapIds) {
    const result = await rankCandidatesForGap(gapId);
    if (result.success) succeeded++;
  }
  return { scanned: gapIds.length, succeeded };
}

router.get('/me', requireAuth, async (req, res) => {
  const result = await getMyProfile(req.user.userId, req.user.role);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

// Real fix for Phase C — no endpoint existed to view ANYONE else's
// profile before this; a candidate or founder was only ever a name
// and a score, nothing to actually evaluate before messaging them.
router.get('/:userId', requireAuth, async (req, res) => {
  const targetResult = await pool.query('SELECT primary_role FROM users WHERE id = $1', [req.params.userId]);
  if (targetResult.rows.length === 0) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
  const result = await getMyProfile(req.params.userId, targetResult.rows[0].primary_role);
  if (!result.success) return res.status(404).json(result);
  if (result.profile.visibility !== 'DISCOVERABLE' && req.params.userId !== req.user.userId) {
    return res.status(403).json({ success: false, error: 'PROFILE_NOT_DISCOVERABLE' });
  }

  // Phase E — real "who viewed your profile" signal. Fire-and-forget:
  // never blocks or fails the actual profile response.
  if (req.params.userId !== req.user.userId) {
    pool.query('INSERT INTO profile_views (viewer_id, viewed_user_id) VALUES ($1, $2)', [req.user.userId, req.params.userId])
      .catch(err => console.error('Profile view logging failed (non-fatal):', err.message));
  }

  res.json(result);
});

router.get('/me/views', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT pv.viewed_at, p.display_name, p.headline, u.primary_role
     FROM profile_views pv
     JOIN users u ON u.id = pv.viewer_id
     JOIN profiles p ON p.user_id = pv.viewer_id
     WHERE pv.viewed_user_id = $1
     ORDER BY pv.viewed_at DESC LIMIT 20`,
    [req.user.userId]
  );
  const countResult = await pool.query('SELECT COUNT(*) FROM profile_views WHERE viewed_user_id = $1', [req.user.userId]);
  res.json({ success: true, views: result.rows, totalCount: parseInt(countResult.rows[0].count) });
});

router.patch('/me', requireAuth, async (req, res) => {
  const result = await updateBaseProfile(req.user.userId, req.body);
  if (!result.success) return res.status(400).json(result);
  if ('skills' in req.body) {
    const refresh = await refreshOpenGapRankings();
    return res.json({ ...result, matching_refresh: refresh });
  }
  res.json(result);
});

router.post('/contributor', requireAuth, requireRole('CONTRIBUTOR'), async (req, res) => {
  const result = await upsertContributorProfile(req.user.userId, req.body);
  if (!result.success) return res.status(400).json(result);
  const refresh = await refreshOpenGapRankings();
  res.json({ ...result, matching_refresh: refresh });
});

router.post('/investor', requireAuth, requireRole('INVESTOR'), async (req, res) => {
  const result = await upsertInvestorProfile(req.user.userId, req.body);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

module.exports = router;
