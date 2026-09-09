const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { getPitch } = require('./pitchService');

router.get('/pitch/:id', requireAuth, async (req, res) => {
  const result = await getPitch(req.params.id, req.user.userId);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

module.exports = router;
