const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { getPitch, savePitchContent, sendPitchToConversation } = require('./pitchService');

router.get('/pitch/:id', requireAuth, async (req, res) => {
  const result = await getPitch(req.params.id, req.user.userId);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

// The founder editing their own pitch.
router.patch('/pitch/:id/content', requireAuth, async (req, res) => {
  const result = await savePitchContent(req.params.id, req.user.userId, req.body);
  if (!result.success) return res.status(result.error === 'FORBIDDEN' ? 403 : 404).json(result);
  res.json(result);
});

// Sending the pitch into a conversation already underway.
router.post('/pitch/:id/send', requireAuth, async (req, res) => {
  const result = await sendPitchToConversation(req.body.conversationId, req.params.id, req.user.userId, req.body.note);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

module.exports = router;
