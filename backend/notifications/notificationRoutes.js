const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { getNotifications, markAsRead, markAllAsRead } = require('./notificationService');

router.get('/', requireAuth, async (req, res) => {
  const unreadOnly = req.query.unread === 'true';
  const result = await getNotifications(req.user.userId, { unreadOnly });
  res.json(result);
});

router.patch('/:id/read', requireAuth, async (req, res) => {
  const result = await markAsRead(req.params.id, req.user.userId);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

router.patch('/read-all', requireAuth, async (req, res) => {
  const result = await markAllAsRead(req.user.userId);
  res.json(result);
});

const { getPreferences, updatePreferences } = require('./notificationPreferencesService');
router.get('/preferences', requireAuth, async (req, res) => res.json(await getPreferences(req.user.userId)));
router.patch('/preferences', requireAuth, async (req, res) => {
  const result = await updatePreferences(req.user.userId, req.body);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

module.exports = router;
