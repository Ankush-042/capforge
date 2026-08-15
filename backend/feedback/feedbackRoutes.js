const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { recordFeedback } = require('./feedbackService');

router.post('/recommendations/:id/feedback', requireAuth, async (req, res) => {
  const { action } = req.body;
  const result = await recordFeedback(req.user.userId, req.params.id, action);
  if (!result.success) {
    const codeMap = { RECOMMENDATION_NOT_FOUND: 404, NOT_AUTHORIZED: 403 };
    return res.status(codeMap[result.error] || 400).json(result);
  }
  res.json(result);
});

module.exports = router;
