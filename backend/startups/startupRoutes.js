const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../auth/authMiddleware');
const { aiEndpointLimit } = require('../shared/rateLimiter');
const { createStartup, analyzeStartup, confirmStartup, getStartup, listMyStartups, getTeamMembers } = require('./startupService');

// SRS §13: only founders create startups.
router.post('/', requireAuth, requireRole('FOUNDER'), aiEndpointLimit, async (req, res) => {
  const { name, rawIdea, currentTeamSize, fundingRaised, fundingStage, targetTimeline, equityOfferedRange, founderDomainExpertise, founderPriorExperience } = req.body;
  const result = await createStartup(req.user.userId, { name, rawIdea, currentTeamSize, fundingRaised, fundingStage, targetTimeline, equityOfferedRange, founderDomainExpertise, founderPriorExperience });
  if (!result.success) return res.status(400).json(result);
  res.status(201).json(result);
});

router.get('/mine', requireAuth, requireRole('FOUNDER'), async (req, res) => {
  const result = await listMyStartups(req.user.userId);
  res.json(result);
});

router.get('/:id', requireAuth, async (req, res) => {
  const result = await getStartup(req.params.id, req.user.userId);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

// SRS §17: re-trigger structuring (e.g. after a failure, or founder wants a fresh AI pass).
router.post('/:id/analyze', requireAuth, requireRole('FOUNDER'), aiEndpointLimit, async (req, res) => {
  const result = await analyzeStartup(req.user.userId, req.params.id);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

// SRS §17: founder reviews and confirms/edits the AI-generated structure.
router.patch('/:id/confirm', requireAuth, requireRole('FOUNDER'), async (req, res) => {
  const result = await confirmStartup(req.user.userId, req.params.id, req.body);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

// SRS §46: real team roster listing — was missing, added when wiring frontend to real data.
router.get('/:id/team', requireAuth, async (req, res) => {
  const result = await getTeamMembers(req.params.id);
  res.json(result);
});

module.exports = router;
