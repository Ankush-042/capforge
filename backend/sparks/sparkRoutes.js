const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { createSpark, listSparks, getSpark, resonate, commitToSpark, getMySparks } = require('./sparkService');

router.post('/sparks', requireAuth, async (req, res) => {
  const result = await createSpark(req.user.userId, req.body);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

router.get('/sparks', requireAuth, async (req, res) => {
  res.json(await listSparks({ viewerId: req.user.userId, tag: req.query.tag }));
});

router.get('/sparks/mine', requireAuth, async (req, res) => {
  res.json(await getMySparks(req.user.userId));
});

router.get('/sparks/:id', requireAuth, async (req, res) => {
  const result = await getSpark(req.params.id, req.user.userId);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

router.post('/sparks/:id/resonate', requireAuth, async (req, res) => {
  const result = await resonate(req.params.id, req.user.userId, req.body.message);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

router.post('/sparks/:id/commit', requireAuth, async (req, res) => {
  const result = await commitToSpark(req.params.id, req.user.userId);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

module.exports = router;
