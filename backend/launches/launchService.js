/**
 * Launches: a venture asks people to use what it built.
 *
 * Until now a venture could hire, pitch or post an idea, but could not ask
 * anybody to try the thing. Founders went off-platform for their first users
 * while sitting inside a network of people who care about their field.
 *
 * Modelled on how YC actually does it: an internal launch to the community
 * first, long before the founder feels ready, where the point is as much the
 * feedback as the users.
 *
 * FEEDBACK IS STRUCTURED, DELIBERATELY. An open comment box produces "cool
 * idea, congrats". Three fixed questions produce something a founder can act
 * on and something that aggregates into a real number.
 */
const pool = require('../shared/db');
const { createNotification } = require('../notifications/notificationService');

const MAX_IMAGES = 4;
const MAX_IMAGE_CHARS = 200000;   // same ceiling as avatars, ~145KB encoded
const MAX_QUESTIONS = 3;

async function ownsStartup(userId, startupId) {
  const r = await pool.query(
    `SELECT 1 FROM startups s
     WHERE s.id = $1 AND (s.founder_id = $2
       OR EXISTS (SELECT 1 FROM startup_team_members tm
                  WHERE tm.startup_id = s.id AND tm.user_id = $2 AND tm.is_founder = true))`,
    [startupId, userId]
  );
  return r.rows.length > 0;
}

async function createLaunch(userId, startupId, input = {}) {
  if (!(await ownsStartup(userId, startupId))) return { success: false, error: 'NOT_YOURS' };

  const title = String(input.title || '').trim();
  const summary = String(input.summary || '').trim();
  if (!title) return { success: false, error: 'TITLE_REQUIRED' };
  if (summary.length < 30) return { success: false, error: 'SUMMARY_TOO_SHORT' };

  // Images are checked HERE as well as in the browser. A size limit enforced
  // only on the client is not a limit.
  const images = (input.images || []).slice(0, MAX_IMAGES)
    .filter((i) => typeof i === 'string' && i.length <= MAX_IMAGE_CHARS);
  if ((input.images || []).length > images.length) {
    return { success: false, error: 'IMAGE_TOO_LARGE' };
  }

  const questions = (input.questions || [])
    .map((q) => String(q).trim()).filter(Boolean).slice(0, MAX_QUESTIONS);

  const r = await pool.query(
    `INSERT INTO launches (startup_id, founder_id, title, summary, link, images, state, questions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [startupId, userId, title, summary, String(input.link || '').trim() || null,
     images, input.state || 'INTERFACE', questions]
  );

  // Tell the people whose field this is. Reuses the spark push discipline:
  // a handful of genuinely relevant people, not everybody.
  notifyRelevantPeople(r.rows[0], startupId).catch((e) =>
    console.error('Launch notification failed (non-fatal):', e.message));

  return { success: true, launch: r.rows[0] };
}

const PUSH_LIMIT = 8;
const QUIET_DAYS = 3;

/**
 * Whoever cares about this field hears about it. Capped and throttled for the
 * same reason spark pushes are: the fastest way to make a notification
 * worthless is to send too many.
 */
async function notifyRelevantPeople(launch, startupId) {
  const people = await pool.query(
    `SELECT p.user_id
     FROM contributor_profiles cp
     JOIN profiles p ON p.id = cp.profile_id
     JOIN users u ON u.id = p.user_id
     JOIN startups s ON s.id = $2
     WHERE u.primary_role = 'CONTRIBUTOR' AND p.visibility = 'DISCOVERABLE'
       AND p.user_id != $3
       AND EXISTS (
         SELECT 1 FROM unnest(COALESCE(cp.preferred_domains, ARRAY[]::text[])) d
         JOIN unnest(COALESCE(s.domain, ARRAY[]::text[])) sd
           ON lower(sd) LIKE '%' || lower(d) || '%' OR lower(d) LIKE '%' || lower(sd) || '%'
       )
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.user_id = p.user_id AND n.type = 'LAUNCH_POSTED'
           AND n.created_at > now() - interval '${QUIET_DAYS} days'
       )
     ORDER BY random() LIMIT ${PUSH_LIMIT}`,
    [launch.id, startupId, launch.founder_id]
  );

  for (const person of people.rows) {
    await createNotification(person.user_id, {
      type: 'LAUNCH_POSTED',
      title: 'Something new to try',
      message: `${launch.title} is asking for people to try it and say what happened.`,
      referenceType: 'LAUNCH',
      referenceId: launch.id,
    });
  }
}

/** The feed. What is live and being talked about, newest first. */
async function listLaunches(viewerId) {
  const r = await pool.query(
    `SELECT l.id, l.title, l.summary, l.link, l.state, l.posted_at, l.closed_at,
            l.images[1] AS cover,
            s.id AS startup_id, s.name AS startup_name, s.domain,
            p.display_name AS founder_name, p.profile_image AS founder_avatar,
            (SELECT COUNT(*)::int FROM launch_feedback f WHERE f.launch_id = l.id) AS feedback_count,
            (SELECT COUNT(*)::int FROM launch_feedback f WHERE f.launch_id = l.id AND f.tried) AS tried_count,
            EXISTS (SELECT 1 FROM launch_feedback f WHERE f.launch_id = l.id AND f.user_id = $1) AS you_responded
     FROM launches l
     JOIN startups s ON s.id = l.startup_id
     JOIN profiles p ON p.user_id = l.founder_id
     ORDER BY l.closed_at IS NOT NULL, l.posted_at DESC
     LIMIT 40`,
    [viewerId]
  );
  return { success: true, launches: r.rows };
}

/**
 * One launch, with everything said about it.
 *
 * The aggregate is computed from real answers, never estimated: "9 of 14 said
 * they would use it again" is either true or the query is wrong.
 */
async function getLaunch(launchId, viewerId) {
  const l = await pool.query(
    `SELECT l.*, s.name AS startup_name, s.domain, s.id AS startup_id,
            p.display_name AS founder_name, p.profile_image AS founder_avatar
     FROM launches l
     JOIN startups s ON s.id = l.startup_id
     JOIN profiles p ON p.user_id = l.founder_id
     WHERE l.id = $1`,
    [launchId]
  );
  if (l.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const launch = l.rows[0];

  const feedback = (await pool.query(
    `SELECT f.*, p.display_name, p.headline, p.profile_image, u.primary_role
     FROM launch_feedback f
     JOIN profiles p ON p.user_id = f.user_id
     JOIN users u ON u.id = f.user_id
     WHERE f.launch_id = $1
     ORDER BY f.created_at DESC`,
    [launchId]
  )).rows;

  const updates = (await pool.query(
    `SELECT * FROM launch_updates WHERE launch_id = $1 ORDER BY created_at DESC`, [launchId]
  )).rows;

  const tried = feedback.filter((f) => f.tried);
  const wouldUse = tried.filter((f) => f.would_use_again === true).length;

  return {
    success: true,
    launch,
    feedback,
    updates,
    isFounder: launch.founder_id === viewerId,
    yourFeedback: feedback.find((f) => f.user_id === viewerId) || null,
    summary: {
      responded: feedback.length,
      tried: tried.length,
      wouldUseAgain: wouldUse,
      // Stated as a fraction of those who actually tried it, not of everyone
      // who commented. Counting opinions from people who never opened it
      // would be the easiest way to make this number a lie.
      wouldUseAgainOf: tried.length,
    },
  };
}

async function giveFeedback(userId, launchId, input = {}) {
  const l = await pool.query(`SELECT founder_id, closed_at, questions FROM launches WHERE id = $1`, [launchId]);
  if (l.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  if (l.rows[0].founder_id === userId) return { success: false, error: 'YOUR_OWN_LAUNCH' };
  if (l.rows[0].closed_at) return { success: false, error: 'CLOSED' };

  const what = String(input.whatHappened || '').trim();
  if (what.length < 10) return { success: false, error: 'TOO_SHORT' };

  const tried = Boolean(input.tried);
  // Only somebody who opened it can say whether they would use it again.
  const wouldUse = tried ? (input.wouldUseAgain === true ? true : input.wouldUseAgain === false ? false : null) : null;
  const answers = (input.answers || []).map((a) => String(a || '').trim())
    .slice(0, (l.rows[0].questions || []).length);

  const r = await pool.query(
    `INSERT INTO launch_feedback (launch_id, user_id, tried, would_use_again, what_happened, answers)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (launch_id, user_id) DO UPDATE
       SET tried = EXCLUDED.tried, would_use_again = EXCLUDED.would_use_again,
           what_happened = EXCLUDED.what_happened, answers = EXCLUDED.answers
     RETURNING *`,
    [launchId, userId, tried, wouldUse, what, answers]
  );

  createNotification(l.rows[0].founder_id, {
    type: 'LAUNCH_FEEDBACK',
    title: tried ? 'Somebody tried it' : 'Somebody responded to your launch',
    message: what.slice(0, 140),
    referenceType: 'LAUNCH',
    referenceId: launchId,
  }).catch(() => {});

  return { success: true, feedback: r.rows[0] };
}

/** The founder marking that a piece of feedback genuinely helped. */
async function markHelpful(userId, feedbackId) {
  const r = await pool.query(
    `UPDATE launch_feedback f SET marked_helpful = NOT f.marked_helpful
     FROM launches l
     WHERE f.id = $1 AND l.id = f.launch_id AND l.founder_id = $2
     RETURNING f.marked_helpful, f.user_id, l.title`,
    [feedbackId, userId]
  );
  if (r.rows.length === 0) return { success: false, error: 'NOT_YOURS' };

  if (r.rows[0].marked_helpful) {
    createNotification(r.rows[0].user_id, {
      type: 'FEEDBACK_HELPED',
      title: 'Your feedback helped',
      message: `The founder of ${r.rows[0].title} marked what you wrote as useful.`,
      referenceType: 'LAUNCH',
      referenceId: null,
    }).catch(() => {});
  }
  return { success: true, helpful: r.rows[0].marked_helpful };
}

/**
 * Closing the loop. The founder fixes something and everyone who took the
 * trouble to respond hears about it.
 */
async function postUpdate(userId, launchId, body) {
  const l = await pool.query(`SELECT founder_id, title FROM launches WHERE id = $1`, [launchId]);
  if (l.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  if (l.rows[0].founder_id !== userId) return { success: false, error: 'NOT_YOURS' };

  const text = String(body || '').trim();
  if (text.length < 10) return { success: false, error: 'TOO_SHORT' };

  const r = await pool.query(
    `INSERT INTO launch_updates (launch_id, body) VALUES ($1, $2) RETURNING *`, [launchId, text]
  );
  await pool.query(`UPDATE launches SET updated_at = now() WHERE id = $1`, [launchId]);

  const responders = await pool.query(
    `SELECT DISTINCT user_id FROM launch_feedback WHERE launch_id = $1`, [launchId]
  );
  for (const p of responders.rows) {
    createNotification(p.user_id, {
      type: 'LAUNCH_UPDATE',
      title: `${l.rows[0].title} has changed`,
      message: text.slice(0, 140),
      referenceType: 'LAUNCH',
      referenceId: launchId,
    }).catch(() => {});
  }

  return { success: true, update: r.rows[0] };
}

async function closeLaunch(userId, launchId) {
  const r = await pool.query(
    `UPDATE launches SET closed_at = CASE WHEN closed_at IS NULL THEN now() ELSE NULL END
     WHERE id = $1 AND founder_id = $2 RETURNING closed_at`,
    [launchId, userId]
  );
  if (r.rows.length === 0) return { success: false, error: 'NOT_YOURS' };
  return { success: true, closed: Boolean(r.rows[0].closed_at) };
}

module.exports = {
  createLaunch, listLaunches, getLaunch, giveFeedback,
  markHelpful, postUpdate, closeLaunch,
};
