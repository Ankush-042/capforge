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

module.exports = router;
