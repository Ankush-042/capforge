/**
 * How a contributor is actually doing, and why.
 *
 * A founder gets a readiness score, a breakdown of what is holding it back,
 * and a page naming the specific causes. A contributor gets nothing about
 * themselves at all. Someone three weeks in with no conversations has no way
 * to know whether their profile is weak, their fields are wrong, nobody is
 * building in their space, or they are being seen and simply not chosen.
 *
 * Those are four completely different problems with four different fixes, and
 * the product could not tell them apart. That asymmetry matters because the
 * contributor is the one being asked to bet years of their life on somebody
 * else's idea, with weaker tools than the person doing the asking.
 *
 * WHAT THIS IS NOT. It is not a score out of 100. Scoring a person the way a
 * venture is scored would be both grim and wrong: a venture is a thing you
 * can fix, a person is not a number. This diagnoses a SITUATION and names
 * what would change it.
 *
 * Every figure here is a real row. Nothing is estimated, and where the data
 * cannot support a conclusion the honest answer is that it is too early to
 * tell, which is stated rather than padded over.
 */
const pool = require('../shared/db');

const MIN_RELEVANCE = 0.20;

async function getContributorStanding(userId) {
  const profileRes = await pool.query(
    `SELECT p.id, p.completion_score, p.headline, p.skills, p.bio, p.visibility, p.created_at,
            cp.looking_for, cp.preferred_domains, cp.preferred_stage, cp.availability
     FROM profiles p
     LEFT JOIN contributor_profiles cp ON cp.profile_id = p.id
     WHERE p.user_id = $1`,
    [userId]
  );
  if (profileRes.rows.length === 0) return { success: false, error: 'NO_PROFILE' };
  const p = profileRes.rows[0];

  const [matchRes, convoRes, viewRes, marketRes, dismissRes] = await Promise.all([
    // Ventures currently matching them above the display threshold.
    pool.query(
      `SELECT COUNT(DISTINCT r.startup_id)::int AS n, COALESCE(MAX(r.score), 0) AS best
       FROM recommendations r
       JOIN gaps g ON g.id = r.source_gap_id
       WHERE r.target_user_id = $1 AND r.recommendation_type = 'CONTRIBUTOR'
         AND r.status = 'ACTIVE' AND g.status NOT IN ('FILLED','DISMISSED')
         AND r.score >= $2`,
      [userId, MIN_RELEVANCE]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS n FROM conversations
       WHERE participant_a_id = $1 OR participant_b_id = $1`,
      [userId]
    ),
    pool.query(`SELECT COUNT(*)::int AS n FROM profile_views WHERE viewed_user_id = $1`, [userId]),
    // Open roles across the platform in the fields they said they care about.
    // This is what separates "nobody wants you" from "nobody is building in
    // your space", which are completely different situations.
    pool.query(
      `SELECT COUNT(*)::int AS n
       FROM gaps g
       JOIN startups s ON s.id = g.startup_id
       JOIN users u ON u.id = s.founder_id
       WHERE g.status NOT IN ('FILLED','DISMISSED')
         AND u.email != 'system.import@capforge.internal'
         AND s.verification_status != 'UNVERIFIED'
         AND ($2::text[] IS NULL OR array_length($2::text[], 1) IS NULL
              OR EXISTS (SELECT 1 FROM unnest(s.domain) d WHERE lower(d) = ANY($2::text[])))`,
      [userId, (p.preferred_domains || []).map((d) => String(d).toLowerCase())]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS n FROM recommendation_feedback
       WHERE user_id = $1 AND action IN ('DISMISS','REJECT')`,
      [userId]
    ),
  ]);

  const matches = matchRes.rows[0].n;
  const bestScore = Math.round(parseFloat(matchRes.rows[0].best) * 100);
  const conversations = convoRes.rows[0].n;
  const profileViews = viewRes.rows[0].n;
  const rolesInYourFields = marketRes.rows[0].n;
  const dismissed = dismissRes.rows[0].n;

  const daysHere = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000);

  // What is actually missing, in the order it costs them most. These are the
  // same fields the matching engine weighs, so this is not generic advice.
  const gaps = [];
  if (!p.looking_for || p.looking_for.trim().length < 20) {
    gaps.push({
      key: 'MISSION',
      what: 'You have not said what you actually want to work on',
      why: 'This carries as much weight as your skills when founders are matched to you. Without it, matching runs on skills alone, which is how people end up shown work they would never take.',
      to: '/app/my-profile',
    });
  }
  if ((p.preferred_domains || []).length === 0) {
    gaps.push({
      key: 'DOMAINS',
      what: 'You have not picked any fields',
      why: 'Ventures in the areas you care about score no higher than any other, so nothing is weighted toward what you actually want.',
      to: '/app/my-profile',
    });
  }
  if ((p.skills || []).length < 3) {
    gaps.push({
      key: 'SKILLS',
      what: 'Your skills are thin',
      why: 'Skill overlap is the single largest component of how you are matched to a role.',
      to: '/app/my-profile',
    });
  }
  if (p.visibility !== 'DISCOVERABLE') {
    gaps.push({
      key: 'HIDDEN',
      what: 'You are not discoverable',
      why: 'Founders cannot find you in search and matching will not surface you. Nothing will reach you while this is set.',
      to: '/app/settings',
    });
  }
  if (!p.headline) {
    gaps.push({
      key: 'HEADLINE',
      what: 'You have no headline',
      why: 'It is the first thing a founder sees next to every match, and the only thing shown before they open your profile.',
      to: '/app/my-profile',
    });
  }

  /**
   * The situation, in plain terms. These are genuinely different problems and
   * the whole point is not blurring them together.
   */
  let situation;
  if (gaps.some((g) => g.key === 'HIDDEN')) {
    situation = 'HIDDEN';
  } else if (gaps.length >= 2) {
    situation = 'PROFILE_THIN';
  } else if (rolesInYourFields === 0) {
    situation = 'EMPTY_MARKET';
  } else if (matches === 0) {
    situation = 'NO_MATCHES';
  } else if (conversations === 0 && daysHere < 7) {
    situation = 'TOO_EARLY';
  } else if (conversations === 0) {
    situation = 'MATCHED_NOT_TALKING';
  } else {
    situation = 'MOVING';
  }

  return {
    success: true,
    standing: {
      situation,
      daysHere,
      completion: p.completion_score || 0,
      matches,
      bestScore,
      conversations,
      profileViews,
      rolesInYourFields,
      dismissed,
      gaps,
      hasMission: Boolean(p.looking_for && p.looking_for.trim().length >= 20),
      domainCount: (p.preferred_domains || []).length,
    },
  };
}

module.exports = { getContributorStanding };
