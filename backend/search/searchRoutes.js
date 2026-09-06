const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { searchStartups, searchContributors, searchInvestors, naturalLanguageSearchStartups, semanticSearchStartups } = require('./searchService');

router.get('/startups', requireAuth, async (req, res) => {
  const { domain, stage, fundingStage, role, skill, q } = req.query;
  const result = await searchStartups({ domain, stage, fundingStage, role, skill, q }, req.user.userId);
  res.json(result);
});

router.get('/contributors', requireAuth, async (req, res) => {
  const { skill, domain, stage, availability, q } = req.query;
  const result = await searchContributors({ skill, domain, stage, availability, q });
  res.json(result);
});

router.get('/investors', requireAuth, async (req, res) => {
  const { domain, stage, q } = req.query;
  const result = await searchInvestors({ domain, stage, q });
  res.json(result);
});

router.get('/startups/nl', requireAuth, async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ success: false, error: 'MISSING_QUERY' });
  const result = await naturalLanguageSearchStartups(query);
  res.json(result);
});

// REAL semantic search — pgvector cosine similarity against real embeddings.
router.get('/startups/semantic', requireAuth, async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ success: false, error: 'MISSING_QUERY' });
  const result = await semanticSearchStartups(query, req.user.userId);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

module.exports = router;
