const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../auth/authMiddleware');
const { rankStartupsForInvestor, getInvestorRecommendations } = require('./investorMatchingService');
const { getPortfolioAnalysis } = require('./portfolioService');
const { sendInvestorConnectionRequest } = require('../connections/connectionService');

router.post('/recommendations/refresh', requireAuth, requireRole('INVESTOR'), async (req, res) => {
  const result = await rankStartupsForInvestor(req.user.userId);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

router.get('/recommendations', requireAuth, requireRole('INVESTOR'), async (req, res) => {
  const result = await getInvestorRecommendations(req.user.userId);
  res.json(result);
});

router.post('/connections', requireAuth, requireRole('INVESTOR'), async (req, res) => {
  const { startupId, message } = req.body;
  const result = await sendInvestorConnectionRequest(req.user.userId, { startupId, message });
  if (!result.success) {
    const codeMap = { STARTUP_NOT_FOUND_OR_NOT_DISCOVERABLE: 404 };
    return res.status(codeMap[result.error] || 400).json(result);
  }
  res.status(201).json(result);
});

router.get('/portfolio', requireAuth, requireRole('INVESTOR'), async (req, res) => {
  res.json(await getPortfolioAnalysis(req.user.userId));
});

module.exports = router;
