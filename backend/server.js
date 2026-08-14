require('dotenv').config();
const express = require('express');
const authRoutes = require('./auth/authRoutes');
const profileRoutes = require('./profiles/profileRoutes');
const startupRoutes = require('./startups/startupRoutes');
const gapRoutes = require('./gaps/gapRoutes');
const readinessRoutes = require('./readiness/readinessRoutes');

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/startups', startupRoutes);
app.use('/api', gapRoutes);
app.use('/api', readinessRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Global error-handling middleware — catches anything that slips past route-level handling.
app.use((err, req, res, next) => {
  console.error('Unhandled route error:', err.message);
  res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
});

// Safety net: never let an unhandled rejection silently kill the process (TRD §56).
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION (server stayed alive):', reason);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CapForge backend listening on port ${PORT}`));

module.exports = app;
