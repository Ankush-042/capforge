const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { generalLimit } = require('../shared/rateLimiter');
const { listRooms, getRoom, createPost, toggleHelped, deletePost } = require('./roomsService');

router.get('/rooms', requireAuth, async (req, res) => {
  res.json(await listRooms(req.user.userId));
});

router.get('/rooms/:room', requireAuth, async (req, res) => {
  const result = await getRoom(req.params.room, req.user.userId);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

// Rate limited: a room is the one place in this product where anyone can
// write anything, so it is the one place worth guarding against a flood.
router.post('/rooms/:room/posts', requireAuth, generalLimit, async (req, res) => {
  const result = await createPost(req.user.userId, req.params.room, req.body?.body, req.body?.parentId);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

router.post('/rooms/posts/:id/helped', requireAuth, async (req, res) => {
  const result = await toggleHelped(req.user.userId, req.params.id);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

router.delete('/rooms/posts/:id', requireAuth, async (req, res) => {
  const result = await deletePost(req.user.userId, req.params.id);
  if (!result.success) return res.status(403).json(result);
  res.json(result);
});

module.exports = router;
