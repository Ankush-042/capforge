const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { getSignalForStartup, getSignalForInvestor, getSignalForContributor } = require('./signalService');

// Founder side: real market intelligence for one specific venture.
router.get('/signal/startup/:id', requireAuth, async (req, res) => {
  const result = await getSignalForStartup(req.params.id, { force: req.query.refresh === 'true' });
  if (!result.success) return res.status(result.error === 'NOT_FOUND' ? 404 : 400).json(result);
  res.json(result);
});

// Investor side: real market intelligence against their own stated thesis.
router.get('/signal/investor', requireAuth, async (req, res) => {
  const result = await getSignalForInvestor(req.user.userId, { force: req.query.refresh === 'true' });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

// Contributors had no market intelligence at all, while founders and
// investors both did. The person being asked to commit years to a field had
// less information about it than either of the other two parties.
router.get('/signal/contributor', requireAuth, async (req, res) => {
  const result = await getSignalForContributor(req.user.userId, { force: req.query.refresh === 'true' });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

module.exports = router;
