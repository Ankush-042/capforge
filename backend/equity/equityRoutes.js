const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { runEquityCalculation } = require('./equityService');

router.post('/equity/calculate', requireAuth, async (req, res) => {
  const { calculationType, startupId, inputs } = req.body;
  const result = await runEquityCalculation(req.user.userId, { calculationType, startupId, inputs });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

module.exports = router;
