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
    // viewer_id added so the UI can link through to whoever looked. Without
    // it the settings page could show a name it was unable to open, which is
    // worse than not showing it at all.
    `SELECT pv.viewed_at, pv.viewer_id AS user_id, p.display_name, p.headline, p.profile_image, u.primary_role
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

// The larger body limit for this path is mounted in server.js, BEFORE the
// global parser, because a router-level parser cannot rescue a request the
// global one has already rejected.
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
    const { scoreContributorAgainstVentures } = require('../matching/alignmentService');
    const pool = require('../shared/db');

    // DESTRUCTIVE ORDER, now fixed. This used to DELETE every alignment score
    // for the user and then try to regenerate them. When the regeneration hit
    // a rate limit, which happens routinely, the person was left with NO
    // alignment at all: worse than the stale scores we were replacing, and
    // permanent until someone ran a script by hand.
    //
    // No invalidation is needed. scoreContributorAgainstVentures upserts on
    // (user_id, startup_id), so a successful run replaces every row anyway.
    // A failed run now leaves the previous scores intact, which are slightly
    // stale rather than absent.
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

    // JUDGE THEM, before ranking.
    //
    // CONFIRMED GAP, and the reason a new signup kept getting nothing. The
    // judgement layer only ever ran from judge-matches.js, a script somebody
    // had to remember to execute. So the engine worked for anyone who existed
    // when it was last run by hand and gave nothing to everyone after them.
    // That is not a working engine, it is a working engine plus a person with
    // a terminal.
    //
    // It runs here now, on the same save that already refreshes alignment and
    // rankings. Pre-filtered to a shortlist, so this is two model calls rather
    // than dozens, and awaited so the ranking below actually sees the result
    // instead of racing it, which is the same mistake the embedding made.
    try {
      const { judgeCandidateAgainstGaps } = require('../shared/matchJudgement');
      const meFull = (await pool.query(
        `SELECT u.id AS user_id, p.headline, p.skills, p.bio,
                cp.looking_for, cp.preferred_domains, cp.preferred_stage,
                cp.experience_years, cp.availability
         FROM users u
         JOIN profiles p ON p.user_id = u.id
         LEFT JOIN contributor_profiles cp ON cp.profile_id = p.id
         WHERE u.id = $1 AND u.primary_role = 'CONTRIBUTOR'`,
        [userId]
      )).rows[0];

      if (meFull && ((meFull.skills || []).length > 0 || meFull.headline)) {
        const openGaps = (await pool.query(
          `SELECT g.id, g.role, g.required_skills, g.reason, g.seeking_type,
                  s.name AS startup_name, s.problem, s.solution, s.domain, s.stage
           FROM gaps g
           JOIN startups s ON s.id = g.startup_id
           JOIN users u2 ON u2.id = s.founder_id
           WHERE g.status NOT IN ('FILLED','DISMISSED')
             AND u2.email != 'system.import@capforge.internal'
             AND s.verification_status != 'UNVERIFIED'`
        )).rows;

        if (openGaps.length > 0) {
          const jr = await judgeCandidateAgainstGaps(meFull, openGaps);
          if (jr?.failed) console.error(`Judgement failed for ${userId}: ${jr.reason}`);
        }
      }
    } catch (err) {
      // Non-fatal by design. Without a judgement the deterministic score
      // stands, which is exactly how the engine behaved before this existed.
      console.error('Judgement step failed (non-fatal):', err.message);
    }

    // WAIT FOR THE EMBEDDING before ranking. It is generated in the
    // background on save, and this used to race it: the re-rank read a null
    // embedding, semantic similarity came back null, and a contributor with a
    // rich mission but few listed skills failed the evidence filter and got
    // nothing. The embedding landed a second later and nothing re-ranked.
    const { awaitEmbedding } = require('./profileService');
    await awaitEmbedding(userId);

    // Only now, with fresh alignment and a real embedding in place, re-rank.
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

/**
 * Rescore an investor's alignment after they change their thesis.
 *
 * Deliberately does NOT invalidate first. Deleting the old scores and then
 * trying to regenerate them is what left a contributor with no alignment at
 * all when the regeneration hit a rate limit: strictly worse than the stale
 * scores being replaced, and permanent until someone ran a script by hand.
 * scoreInvestorAgainstVentures upserts, so a success replaces every row and a
 * failure leaves the previous ones intact.
 *
 * Fire-and-forget: saving a profile must never wait on an LLM call.
 */
const investorRefreshInFlight = new Map();

async function refreshInvestorAlignment(userId) {
  const existing = investorRefreshInFlight.get(userId);
  if (existing) { try { await existing; } catch { /* previous failure is its own problem */ } }

  const run = (async () => {
    const pool = require('../shared/db');
    const { scoreInvestorAgainstVentures } = require('../matching/alignmentService');

    const me = await pool.query(
      `SELECT ip.thesis, ip.preferred_domains, ip.preferred_stages
       FROM investor_profiles ip JOIN profiles p ON p.id = ip.profile_id
       WHERE p.user_id = $1`,
      [userId]
    );
    const row = me.rows[0];
    if (!row?.thesis || row.thesis.trim().length < 20) return;

    const ventures = (await pool.query(
      `SELECT s.id, s.name, s.domain, s.stage, s.problem, s.founder_vision
       FROM startups s JOIN users u ON u.id = s.founder_id
       WHERE s.founder_vision IS NOT NULL AND length(trim(s.founder_vision)) >= 20
         AND u.email != 'system.import@capforge.internal'
         AND s.verification_status != 'UNVERIFIED'`
    )).rows;
    if (ventures.length === 0) return;

    const r = await scoreInvestorAgainstVentures({
      userId, thesis: row.thesis,
      domains: row.preferred_domains, stages: row.preferred_stages, ventures,
    });
    if (r?.failed) console.error(`Investor alignment rescore failed for ${userId}: ${r.reason}`);
  })();

  investorRefreshInFlight.set(userId, run);
  run.catch(err => console.error('Investor alignment refresh failed (non-fatal):', err.message))
     .finally(() => { if (investorRefreshInFlight.get(userId) === run) investorRefreshInFlight.delete(userId); });
  return run;
}

router.post('/investor', requireAuth, requireRole('INVESTOR'), async (req, res) => {
  const result = await upsertInvestorProfile(req.user.userId, req.body);
  if (!result.success) return res.status(400).json(result);
  refreshInvestorAlignment(req.user.userId);
  res.json(result);
});

/**
 * What this person has actually done here, as opposed to what they say.
 *
 * Every other thing on a profile is self-declared. This is not: a founder had
 * to mark their feedback as useful, somebody else had to form a team with
 * them. It was already being recorded and shown nowhere, which made
 * marked_helpful a button that did nothing outside the launch it was on.
 *
 * Deliberately small and deliberately countable. No badges, no score, no
 * levels: three facts with real numbers behind them, and nothing shown when
 * the number is zero rather than an empty state implying they should have
 * some.
 */
router.get('/:userId/record', requireAuth, async (req, res) => {
  const pool = require('../shared/db');
  const { userId } = req.params;

  const [helpful, teams, launches] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS n FROM launch_comments
       WHERE author_id = $1 AND marked_helpful = true`, [userId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS n FROM startup_team_members
       WHERE user_id = $1 AND is_founder = false`, [userId]
    ),
    pool.query(
      `SELECT COUNT(DISTINCT launch_id)::int AS n FROM launch_comments
       WHERE author_id = $1`, [userId]
    ),
  ]);

  res.json({
    success: true,
    record: {
      feedbackFoundUseful: helpful.rows[0].n,
      launchesRespondedTo: launches.rows[0].n,
      teamsJoined: teams.rows[0].n,
    },
  });
});

module.exports = router;
module.exports.refreshEverythingForUser = refreshEverythingForUser;
