const express = require('express');
const router = express.Router();
const { register, login } = require('./authService');
const { requireAuth } = require('./authMiddleware');

const ERROR_STATUS = {
  INVALID_EMAIL: 400, WEAK_PASSWORD: 400, INVALID_ROLE: 400, MISSING_DISPLAY_NAME: 400,
  EMAIL_ALREADY_EXISTS: 409, INVALID_CREDENTIALS: 401, MISSING_CREDENTIALS: 400,
  REGISTRATION_FAILED: 500
};

router.post('/register', async (req, res) => {
  const { email, password, primaryRole, displayName } = req.body;
  const result = await register({ email, password, primaryRole, displayName });
  if (!result.success) {
    return res.status(ERROR_STATUS[result.error] || 500).json(result);
  }
  res.status(201).json(result);
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await login({ email, password });
  if (!result.success) {
    return res.status(ERROR_STATUS[result.error] || 500).json(result);
  }
  res.status(200).json(result);
});

// AUTH-006: logout is stateless (JWT) — client discards the token.
// Kept as a real endpoint so the frontend has a consistent contract.
router.post('/logout', requireAuth, (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out' });
});

router.get('/me', requireAuth, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

module.exports = router;
