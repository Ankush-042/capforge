const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { startOrGetConversation, sendMessage, getMyConversations, getMessages, confirmTeamFormation } = require('./conversationService');

router.post('/conversations', requireAuth, async (req, res) => {
  const { otherUserId, startupId, gapId } = req.body;
  if (!otherUserId) return res.status(400).json({ success: false, error: 'MISSING_OTHER_USER' });
  const result = await startOrGetConversation(req.user.userId, otherUserId, { startupId, gapId });
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

router.get('/conversations', requireAuth, async (req, res) => {
  res.json(await getMyConversations(req.user.userId));
});

router.get('/conversations/:id/messages', requireAuth, async (req, res) => {
  const result = await getMessages(req.params.id, req.user.userId);
  if (!result.success) return res.status(result.error === 'NOT_AUTHORIZED' ? 403 : 404).json(result);
  res.json(result);
});

router.post('/conversations/:id/messages', requireAuth, async (req, res) => {
  const result = await sendMessage(req.params.id, req.user.userId, req.body.content);
  if (!result.success) return res.status(result.error === 'NOT_AUTHORIZED' ? 403 : 400).json(result);
  res.status(201).json(result);
});

router.post('/conversations/:id/confirm-team', requireAuth, async (req, res) => {
  const result = await confirmTeamFormation(req.params.id, req.user.userId);
  if (!result.success) return res.status(result.error === 'NOT_AUTHORIZED' ? 403 : 400).json(result);
  res.json(result);
});

module.exports = router;
