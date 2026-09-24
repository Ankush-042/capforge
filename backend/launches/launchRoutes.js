const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { aiEndpointLimit } = require('../shared/rateLimiter');
const {
  createLaunch, listLaunches, getLaunch, giveFeedback,
  markHelpful, postUpdate, closeLaunch,
} = require('./launchService');
const { readFeedback } = require('./feedbackReader');

router.get('/launches', requireAuth, async (req, res) => {
  res.json(await listLaunches(req.user.userId));
});

router.get('/launches/:id', requireAuth, async (req, res) => {
  const r = await getLaunch(req.params.id, req.user.userId);
  if (!r.success) return res.status(404).json(r);
  res.json(r);
});

// Carries inline images, so it needs more than the 100KB global body limit.
// Scoped here rather than raised for every endpoint, same as profile updates.
const bigBody = express.json({ limit: '2mb' });

router.post('/startups/:startupId/launches', requireAuth, bigBody, async (req, res) => {
  const r = await createLaunch(req.user.userId, req.params.startupId, req.body || {});
  if (!r.success) return res.status(400).json(r);
  res.json(r);
});

router.post('/launches/:id/feedback', requireAuth, async (req, res) => {
  const r = await giveFeedback(req.user.userId, req.params.id, req.body || {});
  if (!r.success) return res.status(400).json(r);
  res.json(r);
});

router.post('/launches/feedback/:id/helpful', requireAuth, async (req, res) => {
  const r = await markHelpful(req.user.userId, req.params.id);
  if (!r.success) return res.status(403).json(r);
  res.json(r);
});

router.post('/launches/:id/updates', requireAuth, async (req, res) => {
  const r = await postUpdate(req.user.userId, req.params.id, req.body?.body);
  if (!r.success) return res.status(400).json(r);
  res.json(r);
});

router.post('/launches/:id/close', requireAuth, async (req, res) => {
  const r = await closeLaunch(req.user.userId, req.params.id);
  if (!r.success) return res.status(403).json(r);
  res.json(r);
});

// The founder's private reading of the feedback. Rate limited like every
// other model-backed endpoint.
router.get('/launches/:id/reading', requireAuth, aiEndpointLimit, async (req, res) => {
  const r = await readFeedback(req.params.id, req.user.userId);
  if (!r.success) return res.status(403).json(r);
  res.json(r);
});

module.exports = router;
