const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { rankCandidatesForGap, getRecommendationsForStartup, getMyRecommendationsAsContributor, compareOpenRoles } = require('./matchingService');
const { getMultiOfferComparison, getLearningRecommendations } = require('./multiOfferService');
const pool = require('../shared/db');

async function assertOwnership(startupId, userId) {
  const r = await pool.query('SELECT founder_id FROM startups WHERE id = $1', [startupId]);
  if (r.rows.length === 0) return { ok: false, code: 404 };
  if (r.rows[0].founder_id !== userId) return { ok: false, code: 403 };
  return { ok: true };
}

// Rank/refresh candidates for one specific gap.
router.post('/gaps/:gapId/rank-candidates', requireAuth, async (req, res) => {
  const gapResult = await pool.query('SELECT startup_id FROM gaps WHERE id = $1', [req.params.gapId]);
  if (gapResult.rows.length === 0) return res.status(404).json({ error: 'GAP_NOT_FOUND' });

  const own = await assertOwnership(gapResult.rows[0].startup_id, req.user.userId);
  if (!own.ok) return res.status(own.code).json({ error: own.code === 404 ? 'NOT_FOUND' : 'FORBIDDEN' });

  const result = await rankCandidatesForGap(req.params.gapId);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

// All current recommendations for a startup, across all its gaps.
router.get('/startups/:id/recommendations', requireAuth, async (req, res) => {
  const own = await assertOwnership(req.params.id, req.user.userId);
  if (!own.ok) return res.status(own.code).json({ error: own.code === 404 ? 'NOT_FOUND' : 'FORBIDDEN' });

  const result = await getRecommendationsForStartup(req.params.id);
  res.json(result);
});

// A contributor's own recommendations across all startups (not startup-scoped).
router.get('/recommendations/mine', requireAuth, async (req, res) => {
  const result = await getMyRecommendationsAsContributor(req.user.userId);
  res.json(result);
});

router.get('/offers/compare', requireAuth, async (req, res) => res.json(await getMultiOfferComparison(req.user.userId)));
router.get('/learning-recommendations', requireAuth, async (req, res) => res.json(await getLearningRecommendations(req.user.userId)));

// Which role to fill first, across every open role at once. A founder with
// three critical gaps and capacity for one had no way to compare them.
router.get('/startups/:id/role-comparison', requireAuth, async (req, res) => {
  const pool = require('../shared/db');
  const own = await pool.query(`SELECT founder_id FROM startups WHERE id = $1`, [req.params.id]);
  if (own.rows.length === 0) return res.status(404).json({ success: false, error: 'NOT_FOUND' });

  let isOwner = own.rows[0].founder_id === req.user.userId;
  if (!isOwner) {
    const co = await pool.query(
      `SELECT 1 FROM startup_team_members WHERE startup_id = $1 AND user_id = $2 AND is_founder = true`,
      [req.params.id, req.user.userId]
    );
    isOwner = co.rows.length > 0;
  }
  if (!isOwner) return res.status(403).json({ success: false, error: 'NOT_AUTHORIZED' });

  res.json(await compareOpenRoles(req.params.id));
});

// How a contributor is actually doing, and why. A founder gets readiness and
// a breakdown of what is holding it back; a contributor got nothing about
// themselves at all.
router.get('/my-standing', requireAuth, async (req, res) => {
  const { getContributorStanding } = require('./contributorStandingService');
  const result = await getContributorStanding(req.user.userId);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

module.exports = router;
