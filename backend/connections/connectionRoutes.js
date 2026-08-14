const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../auth/authMiddleware');
const { sendConnectionRequest, respondToConnection, getMyConnections } = require('./connectionService');

// SRS §43: only founders initiate founder->contributor connections.
router.post('/', requireAuth, requireRole('FOUNDER'), async (req, res) => {
  const { receiverId, startupId, sourceGapId, message } = req.body;
  const result = await sendConnectionRequest(req.user.userId, { receiverId, startupId, sourceGapId, message });
  if (!result.success) {
    const codeMap = { STARTUP_NOT_FOUND: 404, RECEIVER_NOT_FOUND: 404, NOT_STARTUP_OWNER: 403 };
    return res.status(codeMap[result.error] || 400).json(result);
  }
  res.status(201).json(result);
});

// SRS §44: recipient accepts or rejects — this is where the propagation
// chain fires on acceptance (team -> gaps -> readiness, TRD Rule 3).
router.patch('/:id/respond', requireAuth, async (req, res) => {
  const { action } = req.body; // 'accept' | 'reject'
  const result = await respondToConnection(req.params.id, req.user.userId, action);
  if (!result.success) {
    const codeMap = { CONNECTION_NOT_FOUND: 404, NOT_AUTHORIZED: 403 };
    return res.status(codeMap[result.error] || 400).json(result);
  }
  res.json(result);
});

router.get('/', requireAuth, async (req, res) => {
  const result = await getMyConnections(req.user.userId);
  res.json(result);
});

module.exports = router;
