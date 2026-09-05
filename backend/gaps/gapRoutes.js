const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { runGapDiagnosis, getGaps } = require('./gapDiagnosisService');
const { getSkillDemand } = require('./skillDemandService');
const { rankCandidatesForGap } = require('../matching/matchingService');
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

  // Sprint 26 auto-refresh trigger: rank real candidates against every
  // non-FILLED gap immediately, rather than requiring the founder to
  // click into each gap individually. Failures here are non-fatal to
  // the diagnosis response itself — logged, not swallowed silently.
  const rankingResults = [];
  for (const gap of result.gaps) {
    if (gap.status === 'FILLED') continue;
    const rankResult = await rankCandidatesForGap(gap.id);
    rankingResults.push({ gapId: gap.id, role: gap.role, success: rankResult.success, candidateCount: rankResult.recommendations?.length || 0 });
    if (!rankResult.success) console.error(`Auto-ranking failed for gap ${gap.id} (${gap.role}):`, rankResult.error);
  }

  res.json({ ...result, auto_ranking: rankingResults });
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
