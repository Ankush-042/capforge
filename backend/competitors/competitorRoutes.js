const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../auth/authMiddleware');
const { aiEndpointLimit } = require('../shared/rateLimiter');
const { runCompetitorAnalysis, getCompetitorAnalyses } = require('./competitorAnalysisService');
const { researchCompetitors } = require('./competitorResearchService');
const pool = require('../shared/db');

async function assertOwnership(startupId, userId) {
  const r = await pool.query('SELECT founder_id FROM startups WHERE id = $1', [startupId]);
  if (r.rows.length === 0) return { ok: false, code: 404 };
  if (r.rows[0].founder_id === userId) return { ok: true };

  // A co-founder who joined at formation is a real owner of this venture.
  // This file still checked founder_id only, so a co-founder got 403 on their
  // own company. Same fix already applied to getStartup, pitch and elsewhere.
  const co = await pool.query(
    `SELECT 1 FROM startup_team_members WHERE startup_id = $1 AND user_id = $2 AND is_founder = true`,
    [startupId, userId]
  );
  if (co.rows.length > 0) return { ok: true };
  return { ok: false, code: 403 };
}

router.post('/startups/:id/competitor-analysis', requireAuth, requireRole('FOUNDER'), aiEndpointLimit, async (req, res) => {
  const own = await assertOwnership(req.params.id, req.user.userId);
  if (!own.ok) return res.status(own.code).json({ error: own.code === 404 ? 'NOT_FOUND' : 'FORBIDDEN' });
  const result = await runCompetitorAnalysis(req.params.id);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

router.get('/startups/:id/competitor-analysis', requireAuth, async (req, res) => {
  const result = await getCompetitorAnalyses(req.params.id);
  res.json(result);
});

// Real competitor research: actual named companies from the live web, as
// opposed to the inference-only analysis above. Rate limited like every other
// AI endpoint, since each call is two web searches plus a model call.
router.post('/startups/:id/competitor-research', requireAuth, requireRole('FOUNDER'), aiEndpointLimit, async (req, res) => {
  const own = await assertOwnership(req.params.id, req.user.userId);
  if (!own.ok) return res.status(own.code).json({ error: own.code === 404 ? 'NOT_FOUND' : 'FORBIDDEN' });
  const result = await researchCompetitors(req.params.id, { force: req.query.refresh === 'true' });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

router.get('/startups/:id/competitor-research', requireAuth, async (req, res) => {
  const pool2 = require('../shared/db');
  const r = await pool2.query(
    `SELECT * FROM competitors
     WHERE startup_id = $1 AND researched_competitors IS NOT NULL
     ORDER BY researched_at DESC LIMIT 1`,
    [req.params.id]
  );
  res.json({ success: true, research: r.rows[0] || null });
});

module.exports = router;
