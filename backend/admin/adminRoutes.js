const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { requireAdmin } = require('./adminMiddleware');
const { listAllUsers, listAllStartups, setVerificationStatus, getPlatformStats, setUserStatus, setUserAdmin, deleteStartup } = require('./adminService');

router.get('/users', requireAuth, requireAdmin, async (req, res) => res.json(await listAllUsers(req.query.search)));
router.get('/startups', requireAuth, requireAdmin, async (req, res) => res.json(await listAllStartups(req.query.search)));
router.patch('/startups/:id/verification', requireAuth, requireAdmin, async (req, res) => {
  const result = await setVerificationStatus(req.params.id, req.body.status);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});
router.delete('/startups/:id', requireAuth, requireAdmin, async (req, res) => {
  const result = await deleteStartup(req.params.id);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});
router.patch('/users/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const result = await setUserStatus(req.params.id, req.body.status, req.user.userId);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});
router.patch('/users/:id/admin', requireAuth, requireAdmin, async (req, res) => {
  const result = await setUserAdmin(req.params.id, req.body.isAdmin, req.user.userId);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});
router.get('/stats', requireAuth, requireAdmin, async (req, res) => res.json(await getPlatformStats()));

module.exports = router;
