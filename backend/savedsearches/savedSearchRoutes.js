const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { createSavedSearch, getMySavedSearches, deleteSavedSearch, runSavedSearch } = require('./savedSearchService');

router.post('/saved-searches', requireAuth, async (req, res) => {
  const result = await createSavedSearch(req.user.userId, req.body.name, req.body.filters);
  if (!result.success) return res.status(400).json(result);
  res.status(201).json(result);
});

router.get('/saved-searches', requireAuth, async (req, res) => res.json(await getMySavedSearches(req.user.userId)));

router.delete('/saved-searches/:id', requireAuth, async (req, res) => {
  const result = await deleteSavedSearch(req.params.id, req.user.userId);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

router.post('/saved-searches/:id/run', requireAuth, async (req, res) => {
  const result = await runSavedSearch(req.params.id, req.user.userId);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

module.exports = router;
