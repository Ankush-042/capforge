const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { getWorkspace, createTask, updateTask, postDiscussion } = require('./workspaceService');

router.get('/startups/:id/workspace', requireAuth, async (req, res) => {
  const result = await getWorkspace(req.params.id, req.user.userId);
  if (!result.success) return res.status(403).json(result);
  res.json(result);
});

router.post('/startups/:id/workspace/tasks', requireAuth, async (req, res) => {
  const result = await createTask(req.params.id, req.user.userId, req.body);
  if (!result.success) return res.status(result.error === 'NOT_AUTHORIZED' ? 403 : 400).json(result);
  res.status(201).json(result);
});

router.patch('/workspace/tasks/:taskId', requireAuth, async (req, res) => {
  const result = await updateTask(req.params.taskId, req.user.userId, req.body);
  if (!result.success) return res.status(result.error === 'NOT_AUTHORIZED' ? 403 : 400).json(result);
  res.json(result);
});

router.post('/startups/:id/workspace/discussions', requireAuth, async (req, res) => {
  const { content } = req.body;
  const result = await postDiscussion(req.params.id, req.user.userId, content);
  if (!result.success) return res.status(result.error === 'NOT_AUTHORIZED' ? 403 : 400).json(result);
  res.status(201).json(result);
});

module.exports = router;
