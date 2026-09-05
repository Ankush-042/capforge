const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { rankCandidatesForGap, getRecommendationsForStartup, getMyRecommendationsAsContributor } = require('./matchingService');
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

module.exports = router;
