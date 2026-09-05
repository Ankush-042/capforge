const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { runGapDiagnosis, getGaps } = require('./gapDiagnosisService');
const { getSkillDemand } = require('./skillDemandService');
const pool = require('../shared/db');

async function assertOwnership(startupId, userId) {
  const r = await pool.query('SELECT founder_id FROM startups WHERE id = $1', [startupId]);
  if (r.rows.length === 0) return { ok: false, code: 404 };
  if (r.rows[0].founder_id !== userId) return { ok: false, code: 403 };
  return { ok: true };
}

router.post('/startups/:id/diagnose', requireAuth, async (req, res) => {
  const own = await assertOwnership(req.params.id, req.user.userId);
  if (!own.ok) return res.status(own.code).json({ error: own.code === 404 ? 'NOT_FOUND' : 'FORBIDDEN' });

  const result = await runGapDiagnosis(req.params.id);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

router.get('/startups/:id/gaps', requireAuth, async (req, res) => {
  const own = await assertOwnership(req.params.id, req.user.userId);
  if (!own.ok) return res.status(own.code).json({ error: own.code === 404 ? 'NOT_FOUND' : 'FORBIDDEN' });

  const result = await getGaps(req.params.id);
  res.json(result);
});

// Real, platform-wide skill demand aggregation — new feature, AI spec §named-but-unbuilt.
router.get('/skill-demand', requireAuth, async (req, res) => {
  const result = await getSkillDemand(req.user.userId);
  res.json(result);
});

module.exports = router;
