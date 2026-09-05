const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../auth/authMiddleware');
const { requestVerification, getVerificationStatus } = require('./trustService');

router.post('/startups/:id/request-verification', requireAuth, requireRole('FOUNDER'), async (req, res) => {
  const result = await requestVerification(req.params.id, req.user.userId);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});
router.get('/startups/:id/verification', requireAuth, async (req, res) => res.json(await getVerificationStatus(req.params.id)));

module.exports = router;
