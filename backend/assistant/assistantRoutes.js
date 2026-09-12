const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { aiEndpointLimit } = require('../shared/rateLimiter');
const { askAboutVenture } = require('./assistantService');

// Rate limited like every other AI endpoint. A founder asking ten questions a
// minute is not a use case worth optimising for, and an unlimited AI endpoint
// is how a key gets burned through in an afternoon.
router.post('/startups/:id/ask', requireAuth, aiEndpointLimit, async (req, res) => {
  const result = await askAboutVenture(req.params.id, req.user.userId, req.body?.question);
  if (!result.success) {
    return res.status(result.error === 'NOT_AUTHORIZED' ? 403 : result.error === 'NOT_FOUND' ? 404 : 400).json(result);
  }
  res.json(result);
});

module.exports = router;
