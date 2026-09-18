const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../auth/authMiddleware');
const { rankStartupsForInvestor, getInvestorRecommendations, rankInvestorsForStartup } = require('./investorMatchingService');
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


// A founder finding investors, which is the one direction of the flow that
// was never built. Investors browsed and reached out; founders could only
// wait to be found.
router.get('/for-startup/:id', requireAuth, async (req, res) => {
  const result = await rankInvestorsForStartup(req.params.id, req.user.userId);
  if (!result.success) return res.status(result.error === 'NOT_AUTHORIZED' ? 403 : 404).json(result);
  res.json(result);
});

// An investor tracking what they are watching and what they passed on.
// Every other role on this platform had state; the investor had none.
const { setWatchStatus, removeFromWatchlist, getWatchlist, getWatchState } = require('./watchlistService');

router.get('/watchlist', requireAuth, requireRole('INVESTOR'), async (req, res) => {
  res.json(await getWatchlist(req.user.userId));
});

router.get('/watchlist/:startupId', requireAuth, requireRole('INVESTOR'), async (req, res) => {
  res.json(await getWatchState(req.user.userId, req.params.startupId));
});

router.post('/watchlist/:startupId', requireAuth, requireRole('INVESTOR'), async (req, res) => {
  const result = await setWatchStatus(req.user.userId, req.params.startupId, req.body?.status, req.body?.note);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

router.delete('/watchlist/:startupId', requireAuth, requireRole('INVESTOR'), async (req, res) => {
  res.json(await removeFromWatchlist(req.user.userId, req.params.startupId));
});

module.exports = router;
