const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../auth/authMiddleware');
const { matchOpportunitiesForStartup, createOpportunity } = require('./opportunityService');

router.get('/startups/:id/opportunities', requireAuth, async (req, res) => {
  const result = await matchOpportunitiesForStartup(req.params.id);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

router.post('/opportunities', requireAuth, async (req, res) => {
  const result = await createOpportunity(req.body);
  res.status(201).json(result);
});

module.exports = router;
