const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { runReadinessAndRiskAnalysis, getLatestReadiness, getRisks, getReadinessHistory } = require('./readinessService');
const { getVentureSummary } = require('./ventureSummaryService');
const { getProgress } = require('./progressService');
const pool = require('../shared/db');

async function assertOwnership(startupId, userId) {
  const r = await pool.query('SELECT founder_id FROM startups WHERE id = $1', [startupId]);
  if (r.rows.length === 0) return { ok: false, code: 404 };
  if (r.rows[0].founder_id !== userId) return { ok: false, code: 403 };
  return { ok: true };
}

router.post('/startups/:id/assess', requireAuth, async (req, res) => {
  const own = await assertOwnership(req.params.id, req.user.userId);
  if (!own.ok) return res.status(own.code).json({ error: own.code === 404 ? 'NOT_FOUND' : 'FORBIDDEN' });

  const result = await runReadinessAndRiskAnalysis(req.params.id);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

router.get('/startups/:id/readiness', requireAuth, async (req, res) => {
  const own = await assertOwnership(req.params.id, req.user.userId);
  if (!own.ok) return res.status(own.code).json({ error: own.code === 404 ? 'NOT_FOUND' : 'FORBIDDEN' });

  const result = await getLatestReadiness(req.params.id);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

router.get('/startups/:id/risks', requireAuth, async (req, res) => {
  const own = await assertOwnership(req.params.id, req.user.userId);
  if (!own.ok) return res.status(own.code).json({ error: own.code === 404 ? 'NOT_FOUND' : 'FORBIDDEN' });

  const result = await getRisks(req.params.id);
  res.json(result);
});

// One question answered properly: how is this venture doing, and why.
// Joins readiness, risks, gaps and milestones so a founder does not have to
// hold four screens in their head.
router.get('/startups/:id/progress', requireAuth, async (req, res) => {
  const result = await getProgress(req.params.id, req.user.userId);
  if (!result.success) return res.status(result.error === 'NOT_AUTHORIZED' ? 403 : 404).json(result);
  res.json(result);
});

// How a venture got where it is. Readable by anybody who can already see the
// venture: an investor evaluating it needs the movement, not just the number.
router.get('/startups/:id/trajectory', requireAuth, async (req, res) => {
  const { getTrajectory } = require('./trajectoryService');
  const r = await getTrajectory(req.params.id);
  if (!r.success) return res.status(404).json(r);
  res.json(r);
});

module.exports = router;

router.get('/startups/:id/venture-summary', requireAuth, async (req, res) => {
  const startupResult = await pool.query('SELECT founder_id, status, visibility FROM startups WHERE id = $1', [req.params.id]);
  if (startupResult.rows.length === 0) return res.status(404).json({ error: 'NOT_FOUND' });
  const s = startupResult.rows[0];
  const isOwner = s.founder_id === req.user.userId;
  const isDiscoverable = s.status === 'ACTIVE' && s.visibility === 'DISCOVERABLE';
  if (!isOwner && !isDiscoverable) return res.status(403).json({ error: 'FORBIDDEN' });

  res.json(await getVentureSummary(req.params.id));
});

router.get('/startups/:id/readiness-history', requireAuth, async (req, res) => {
  const own = await assertOwnership(req.params.id, req.user.userId);
  if (!own.ok) return res.status(own.code).json({ error: own.code === 404 ? 'NOT_FOUND' : 'FORBIDDEN' });
  res.json(await getReadinessHistory(req.params.id));
});
