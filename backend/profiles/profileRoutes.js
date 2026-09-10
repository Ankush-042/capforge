const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../auth/authMiddleware');
const { getMyProfile, updateBaseProfile, upsertContributorProfile, upsertInvestorProfile } = require('./profileService');
const { getOpenGapIds } = require('../gaps/gapDiagnosisService');
const pool = require('../shared/db');
const { rankCandidatesForGap } = require('../matching/matchingService');

/**
 * Sprint 26 auto-refresh trigger, contributor side: re-scans every
 * currently open gap platform-wide so a newly-completed profile gets
 * real recommendations immediately, matching how real platforms
 * (Wellfound, Indeed) work — completing your profile is itself the
 * trigger, not waiting for someone else to act first.
 */
async function refreshOpenGapRankings() {
  const gapIds = await getOpenGapIds();
  let succeeded = 0;
  for (const gapId of gapIds) {
    const result = await rankCandidatesForGap(gapId);
    if (result.success) succeeded++;
  }
  return { scanned: gapIds.length, succeeded };
}

router.get('/me', requireAuth, async (req, res) => {
  const result = await getMyProfile(req.user.userId, req.user.role);
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

// Real fix for Phase C — no endpoint existed to view ANYONE else's
// profile before this; a candidate or founder was only ever a name
// and a score, nothing to actually evaluate before messaging them.
router.get('/:userId', requireAuth, async (req, res) => {
  const targetResult = await pool.query('SELECT primary_role FROM users WHERE id = $1', [req.params.userId]);
  if (targetResult.rows.length === 0) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
  const result = await getMyProfile(req.params.userId, targetResult.rows[0].primary_role);
  if (!result.success) return res.status(404).json(result);
  if (result.profile.visibility !== 'DISCOVERABLE' && req.params.userId !== req.user.userId) {
    return res.status(403).json({ success: false, error: 'PROFILE_NOT_DISCOVERABLE' });
  }

  // Phase E — real "who viewed your profile" signal. Fire-and-forget:
  // never blocks or fails the actual profile response.
  if (req.params.userId !== req.user.userId) {
    pool.query('INSERT INTO profile_views (viewer_id, viewed_user_id) VALUES ($1, $2)', [req.user.userId, req.params.userId])
      .catch(err => console.error('Profile view logging failed (non-fatal):', err.message));
  }

  res.json(result);
});

router.get('/me/views', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT pv.viewed_at, p.display_name, p.headline, u.primary_role
     FROM profile_views pv
     JOIN users u ON u.id = pv.viewer_id
     JOIN profiles p ON p.user_id = pv.viewer_id
     WHERE pv.viewed_user_id = $1
     ORDER BY pv.viewed_at DESC LIMIT 20`,
    [req.user.userId]
  );
  const countResult = await pool.query('SELECT COUNT(*) FROM profile_views WHERE viewed_user_id = $1', [req.user.userId]);
  res.json({ success: true, views: result.rows, totalCount: parseInt(countResult.rows[0].count) });
});

router.patch('/me', requireAuth, async (req, res) => {
  const result = await updateBaseProfile(req.user.userId, req.body);
  if (!result.success) return res.status(400).json(result);

  // REAL FIX for a confirmed timeout: refreshOpenGapRankings() loops
  // through EVERY currently-open gap on the ENTIRE PLATFORM, sequentially,
  // awaited — with 19+ real gaps now on the platform (vs. a handful when
  // this was first built), this alone could take well over 15 seconds,
  // blocking the actual profile save response the whole time. The save
  // itself has already succeeded above; the platform-wide re-ranking is
  // a background enhancement and must never block the response the user
  // is actually waiting on — exact same class of fix as the earlier
  // embedding-generation timeout, just a different cause this time.
  // Was 'skills' only, so changing a headline alone silently left every
  // explanation claiming the old role matched.
  if ('skills' in req.body || 'headline' in req.body || 'bio' in req.body) {
    refreshEverythingForUser(req.user.userId);
  }
  res.json(result);
});


/**
 * Everything that must happen after a contributor edits their profile, in
 * the right ORDER. Confirmed broken before this: a contributor changed their
 * headline, skills, mission and domains from a backend engineer to a UX
 * researcher, and afterwards still saw "profile headline directly matches
 * the Backend Engineer role" and an alignment reason quoting their OLD
 * mission.
 *
 * Three separate faults, all fixed here:
 *   1. Alignment was NEVER invalidated. invalidateForUser existed and was
 *      called from nowhere, so alignment scores silently described a person
 *      who no longer exists.
 *   2. Order mattered and was wrong. Re-ranking before re-scoring alignment
 *      bakes the stale alignment into the new rankings.
 *   3. Saving basics and saving contributor details fired two OVERLAPPING
 *      refreshes, producing the half-updated mixture that was visible in the
 *      output. They are now serialised per user.
 *
 * Still fire-and-forget overall: a profile save must never wait on an LLM
 * call or a platform-wide re-rank.
 */
const refreshInFlight = new Map();

async function refreshEverythingForUser(userId) {
  // Serialise per user. A second save while the first is still running waits
  // for it rather than racing it.
  const existing = refreshInFlight.get(userId);
  if (existing) { try { await existing; } catch { /* previous failure is its own problem */ } }

  const run = (async () => {
    const { invalidateForUser, scoreContributorAgainstVentures } = require('../matching/alignmentService');
    const pool = require('../shared/db');

    await invalidateForUser(userId);

    const me = await pool.query(
      `SELECT p.headline, cp.looking_for, cp.preferred_domains
       FROM profiles p LEFT JOIN contributor_profiles cp ON cp.profile_id = p.id
       WHERE p.user_id = $1`,
      [userId]
    );
    const row = me.rows[0];

    if (row?.looking_for && row.looking_for.trim().length >= 20) {
      const ventures = (await pool.query(
        `SELECT s.id, s.name, s.domain, s.problem, s.founder_vision
         FROM startups s JOIN users u ON u.id = s.founder_id
         WHERE s.founder_vision IS NOT NULL AND length(trim(s.founder_vision)) >= 20
           AND u.email != 'system.import@capforge.internal'
           AND s.verification_status != 'UNVERIFIED'`
      )).rows;

      if (ventures.length > 0) {
        const r = await scoreContributorAgainstVentures({
          userId, mission: row.looking_for, headline: row.headline,
          domains: row.preferred_domains, ventures,
        });
        if (r?.failed) console.error(`Alignment rescore failed for ${userId}: ${r.reason}`);
      }
    }

    // Only now, with fresh alignment in place, re-rank.
    //
    // TARGETED, not platform-wide. refreshOpenGapRankings re-ranks every
    // candidate for all 62 gaps, which is minutes of work when exactly one
    // person changed. In practice that meant the automatic path never
    // finished before the user looked at their results, and the list only
    // became correct after running a script by hand. Nobody should have to
    // do that.
    //
    // Nobody else's data changed, so nobody else's rows need recomputing.
    const { refreshRankingsForContributor } = require('../matching/matchingService');
    const r = await refreshRankingsForContributor(userId);
    if (!r.success && r.error !== 'NOT_AN_ELIGIBLE_CONTRIBUTOR') {
      console.error(`Targeted refresh failed for ${userId}:`, r.error);
    }
  })();

  refreshInFlight.set(userId, run);
  run.catch(err => console.error('Post-save refresh failed (non-fatal):', err.message))
     .finally(() => { if (refreshInFlight.get(userId) === run) refreshInFlight.delete(userId); });
  return run;
}

router.post('/contributor', requireAuth, requireRole('CONTRIBUTOR'), async (req, res) => {
  const result = await upsertContributorProfile(req.user.userId, req.body);
  if (!result.success) return res.status(400).json(result);
  // Same real fix as PATCH /me — this must never block the response.
  refreshEverythingForUser(req.user.userId);
  res.json(result);
});

router.post('/investor', requireAuth, requireRole('INVESTOR'), async (req, res) => {
  const result = await upsertInvestorProfile(req.user.userId, req.body);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

module.exports = router;
