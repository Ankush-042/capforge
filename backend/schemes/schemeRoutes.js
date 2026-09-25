const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { getSchemesFor, updateSchemeFacts } = require('./schemeService');

router.get('/startups/:id/schemes', requireAuth, async (req, res) => {
  const r = await getSchemesFor(req.params.id, req.user.userId);
  if (!r.success) return res.status(r.error === 'NOT_YOURS' ? 403 : 404).json(r);
  res.json(r);
});

router.patch('/startups/:id/scheme-facts', requireAuth, async (req, res) => {
  const r = await updateSchemeFacts(req.user.userId, req.params.id, req.body || {});
  if (!r.success) return res.status(r.error === 'NOT_YOURS' ? 403 : 400).json(r);
  res.json(r);
});

module.exports = router;
