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
// Explicit rather than relying on the 100KB default, so the limit is a
// decision rather than an accident. Profile updates carry an inline avatar and
// need more, but they ask for it on their own route rather than widening this
// one for every endpoint.
app.use(express.json({ limit: '100kb' }));

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
const sparkRoutes = require('./sparks/sparkRoutes');
app.use('/api', sparkRoutes);
const signalRoutes = require('./signal/signalRoutes');
app.use('/api', signalRoutes);
const pitchRoutes = require('./pitch/pitchRoutes');
app.use('/api', pitchRoutes);
// Track when someone was last here, so the product can tell them what
// changed. Runs on every authenticated API call, fire-and-forget.
const { touchSession } = require('./shared/sessionTracker');
const { requireAuth: _requireAuthForTouch } = require('./auth/authMiddleware');
app.use('/api', (req, res, next) => {
  // Only touches when a valid token is already attached by a downstream
  // route's own requireAuth. Decoding here would duplicate auth work on every
  // request, so this reads what is already there and does nothing otherwise.
  if (req.user?.userId) return touchSession(req, res, next);
  next();
});

const whatsNewRoutes = require('./shared/whatsNewRoutes');
app.use('/api', whatsNewRoutes);

const roomsRoutes = require('./rooms/roomsRoutes');
app.use('/api', roomsRoutes);

const assistantRoutes = require('./assistant/assistantRoutes');
app.use('/api', assistantRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

/**
 * SERVE THE FRONTEND FROM THE SAME PROCESS.
 *
 * In development, Vite proxies /api to localhost:3000 and the two run
 * separately. That proxy does not exist in production, so a deployed frontend
 * calling '/api' would hit its own static host and get a 404 on every
 * request.
 *
 * The usual fix is two deployments plus CORS plus an API-URL environment
 * variable, which is three more things that can be misconfigured. Serving the
 * built frontend from this process instead means one deployment, one origin,
 * no CORS, and '/api' keeps resolving exactly as it does locally. The
 * frontend code needs no change at all.
 *
 * Mounted AFTER every API route, so nothing here can shadow them, and the SPA
 * fallback explicitly refuses /api paths so a mistyped endpoint returns a JSON
 * 404 rather than silently serving index.html, which would look to the caller
 * like the API returning HTML.
 */
const path = require('path');
const fs = require('fs');
const clientDist = path.join(__dirname, '..', 'frontend', 'dist');

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log('Serving frontend build from frontend/dist');
} else {
  console.log('No frontend build found. Run: npm --prefix frontend run build');
}

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
