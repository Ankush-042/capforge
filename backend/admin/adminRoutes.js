const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { requireAdmin } = require('./adminMiddleware');
const { listAllUsers, listAllStartups, setVerificationStatus, getPlatformStats } = require('./adminService');

router.get('/users', requireAuth, requireAdmin, async (req, res) => res.json(await listAllUsers()));
router.get('/startups', requireAuth, requireAdmin, async (req, res) => res.json(await listAllStartups()));
router.patch('/startups/:id/verification', requireAuth, requireAdmin, async (req, res) => {
  const result = await setVerificationStatus(req.params.id, req.body.status);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});
router.get('/stats', requireAuth, requireAdmin, async (req, res) => res.json(await getPlatformStats()));

module.exports = router;
