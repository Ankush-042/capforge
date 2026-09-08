require('dotenv').config();
const express = require('express');
const authRoutes = require('./auth/authRoutes');
const profileRoutes = require('./profiles/profileRoutes');
const startupRoutes = require('./startups/startupRoutes');
const gapRoutes = require('./gaps/gapRoutes');
const readinessRoutes = require('./readiness/readinessRoutes');
const matchingRoutes = require('./matching/matchingRoutes');
const connectionRoutes = require('./connections/connectionRoutes');
const investorRoutes = require('./investors/investorRoutes');
const searchRoutes = require('./search/searchRoutes');
const notificationRoutes = require('./notifications/notificationRoutes');
const feedbackRoutes = require('./feedback/feedbackRoutes');
const competitorRoutes = require('./competitors/competitorRoutes');
const milestoneRoutes = require('./milestones/milestoneRoutes');
const equityRoutes = require('./equity/equityRoutes');
const opportunityRoutes = require('./opportunities/opportunityRoutes');
const workspaceRoutes = require('./workspace/workspaceRoutes');

const app = express();
app.use(express.json());

// Real fix for a confirmed identity-leak symptom: no response from this
// API ever declared it shouldn't be cached, meaning a browser could
// legally serve a stale cached response for an identical URL (e.g.
// GET /api/profiles/me) across two completely different logged-in
// users. Every API response now explicitly forbids caching — this is
// also just correct practice for any authenticated API, not a hack.
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

const { authLimit } = require('./shared/rateLimiter');
app.use('/api/auth', authLimit, authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/startups', startupRoutes);
app.use('/api', gapRoutes);
app.use('/api', readinessRoutes);
app.use('/api', matchingRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/investors', investorRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', competitorRoutes);
app.use('/api', milestoneRoutes);
app.use('/api', equityRoutes);
app.use('/api', opportunityRoutes);
app.use('/api', workspaceRoutes);
const trustRoutes = require('./trust/trustRoutes');
const reputationRoutes = require('./reputation/reputationRoutes');
const adminRoutes = require('./admin/adminRoutes');
app.use('/api', trustRoutes);
app.use('/api', reputationRoutes);
app.use('/api/admin', adminRoutes);
const legalRoutes = require('./legal/legalRoutes');
app.use('/api', legalRoutes);
const conversationRoutes = require('./conversations/conversationRoutes');
app.use('/api', conversationRoutes);
const savedSearchRoutes = require('./savedsearches/savedSearchRoutes');
app.use('/api', savedSearchRoutes);
const publicRoutes = require('./public/publicRoutes');
app.use('/api', publicRoutes);

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
