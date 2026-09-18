const express = require('express');
const router = express.Router();
const pool = require('./db');
const { requireAuth } = require('../auth/authMiddleware');
const { getWhatsNew } = require('./whatsNewService');
const { touchSession } = require('./sessionTracker');

/**
 * What changed since you were last here.
 *
 * Touches the session AFTER computing the answer, not before. Touching first
 * would move the reference point to now and make the result permanently empty,
 * which is exactly the trap the two-column design exists to avoid.
 */
router.get('/whats-new', requireAuth, async (req, res) => {
  const userRes = await pool.query('SELECT primary_role FROM users WHERE id = $1', [req.user.userId]);
  const role = userRes.rows[0]?.primary_role || 'FOUNDER';
  const result = await getWhatsNew(req.user.userId, role);
  res.json(result);
  // After responding, so it never delays the answer.
  touchSession(req, res, () => {});
});

module.exports = router;
