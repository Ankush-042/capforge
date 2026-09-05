const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/authMiddleware');
const { computeReputation } = require('./reputationService');

router.get('/reputation/me', requireAuth, async (req, res) => res.json(await computeReputation(req.user.userId)));
router.get('/reputation/:userId', requireAuth, async (req, res) => res.json(await computeReputation(req.params.userId)));

module.exports = router;
