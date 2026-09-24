const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { aiEndpointLimit } = require('../shared/rateLimiter');
const {
  createLaunch, listLaunches, getLaunch, comment,
  markHelpful, postUpdate, closeLaunch,
} = require('./launchService');
const { askAboutLaunch, SUGGESTED } = require('./launchAssistant');

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

router.post('/launches/:id/comments', requireAuth, async (req, res) => {
  const r = await comment(req.user.userId, req.params.id, req.body || {});
  if (!r.success) return res.status(400).json(r);
  res.json(r);
});

router.post('/launches/comments/:id/helpful', requireAuth, async (req, res) => {
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

// The founder asking about their own launch rather than reading all of it.
// Rate limited like every other model-backed endpoint.
router.post('/launches/:id/ask', requireAuth, aiEndpointLimit, async (req, res) => {
  const r = await askAboutLaunch(req.params.id, req.user.userId, req.body?.question);
  if (!r.success) return res.status(r.error === 'NOT_YOURS' ? 403 : 400).json(r);
  res.json({ ...r, suggested: SUGGESTED });
});

module.exports = router;
