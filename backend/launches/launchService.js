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
 * WHAT OPENS UNDER A LAUNCH IS A ROOM, not a feedback form. The first version
 * of this had three fixed questions: did you try it, would you use it again,
 * what broke. Tidy, aggregatable, and wrong. A form collects statements; it
 * cannot produce the thing that actually helps a founder, which is people
 * arguing with each other. Two testers hitting the same wall never find out.
 * Nobody can ask "which browser?". Nobody sharpens their view because somebody
 * else said something better.
 *
 * So people talk, reply, and disagree, and the founder is in it with them.
 * The founder does not read all of it: they ask the assistant, which has.
 */
const pool = require('../shared/db');
const { createNotification } = require('../notifications/notificationService');

const MAX_IMAGES = 4;
const MAX_IMAGE_CHARS = 200000;   // same ceiling as avatars, ~145KB encoded

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

  // One line saying what would help most, not a form for the visitor to fill
  // in. It sits at the top of the room rather than gating entry to it.
  const askingAbout = String(input.askingAbout || '').trim() || null;

  const r = await pool.query(
    `INSERT INTO launches (startup_id, founder_id, title, summary, link, images, state, asking_about)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [startupId, userId, title, summary, String(input.link || '').trim() || null,
     images, input.state || 'INTERFACE', askingAbout]
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
     JOIN startups s ON s.id = $1
     WHERE u.primary_role = 'CONTRIBUTOR' AND p.visibility = 'DISCOVERABLE'
       AND p.user_id != $2
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
    [startupId, launch.founder_id]
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


/**
 * Fix a launch after posting it.
 *
 * A founder pastes the wrong link, uploads the wrong screenshots, or realises
 * the description does not say what the thing is. Without this their only
 * option is to delete and repost, which throws away every message people have
 * already written underneath. That is a real cost for a typo.
 *
 * No edit history and no "edited" badge, for the same reason sparks have
 * none: a badge implies suspicion about somebody correcting their own post,
 * which is exactly the behaviour worth encouraging. What IS recorded is
 * updated_at, so the feed can show when something changed.
 */
async function updateLaunch(userId, launchId, input = {}) {
  const existing = await pool.query(`SELECT founder_id FROM launches WHERE id = $1`, [launchId]);
  if (existing.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  if (existing.rows[0].founder_id !== userId) return { success: false, error: 'NOT_YOURS' };

  const fields = [];
  const values = [];
  const add = (col, val) => { values.push(val); fields.push(`${col} = $${values.length + 1}`); };

  if (input.title !== undefined) {
    const t = String(input.title).trim();
    if (!t) return { success: false, error: 'TITLE_REQUIRED' };
    add('title', t);
  }
  if (input.summary !== undefined) {
    const sm = String(input.summary).trim();
    if (sm.length < 30) return { success: false, error: 'SUMMARY_TOO_SHORT' };
    add('summary', sm);
  }
  if (input.link !== undefined) add('link', String(input.link).trim() || null);
  if (input.state !== undefined) add('state', input.state);
  if (input.askingAbout !== undefined) add('asking_about', String(input.askingAbout).trim() || null);

  if (input.images !== undefined) {
    // Checked here as well as in the browser. A size limit enforced only on
    // the client is not a limit.
    const images = (input.images || []).slice(0, MAX_IMAGES)
      .filter((i) => typeof i === 'string' && i.length <= MAX_IMAGE_CHARS);
    if ((input.images || []).length > images.length) return { success: false, error: 'IMAGE_TOO_LARGE' };
    add('images', images);
  }

  if (fields.length === 0) return { success: false, error: 'NOTHING_TO_UPDATE' };

  const r = await pool.query(
    `UPDATE launches SET ${fields.join(', ')}, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [launchId, ...values]
  );
  return { success: true, launch: r.rows[0] };
}

/**
 * Remove a launch entirely.
 *
 * Everything under it goes: the discussion, the updates. That is why the
 * interface asks first and says how many messages will be lost, because a
 * founder deleting a typo should not silently destroy eleven people's
 * written feedback. Closing it is usually what they actually want, and the
 * interface offers that alongside.
 */
async function deleteLaunch(userId, launchId) {
  const existing = await pool.query(
    `SELECT l.founder_id,
            (SELECT COUNT(*)::int FROM launch_comments c WHERE c.launch_id = l.id) AS comments
     FROM launches l WHERE l.id = $1`,
    [launchId]
  );
  if (existing.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  if (existing.rows[0].founder_id !== userId) return { success: false, error: 'NOT_YOURS' };

  await pool.query(`DELETE FROM launches WHERE id = $1`, [launchId]);
  return { success: true, deletedComments: existing.rows[0].comments };
}

/**
 * Launches, scoped to who is asking.
 *
 * A FOUNDER OPENS THIS TO SEE THEIR OWN. They posted something and want to
 * know who is talking about it. Showing them everybody else's launches makes
 * this a browse feed, which is not what they came for and duplicates Sparks,
 * which is already the place you browse what other people are putting out.
 *
 * A CONTRIBUTOR OPENS IT TO FIND SOMETHING TO TRY, so they get everything.
 *
 * mine=true returns only the viewer's own.
 */
async function listLaunches(viewerId, { mine = false } = {}) {
  const r = await pool.query(
    `SELECT l.id, l.title, l.summary, l.link, l.state, l.posted_at, l.closed_at,
            l.images[1] AS cover,
            s.id AS startup_id, s.name AS startup_name, s.domain,
            p.display_name AS founder_name, p.profile_image AS founder_avatar,
            (SELECT COUNT(*)::int FROM launch_comments c WHERE c.launch_id = l.id) AS comment_count,
            (SELECT COUNT(DISTINCT c.author_id)::int FROM launch_comments c WHERE c.launch_id = l.id) AS people_count,
            (SELECT COUNT(DISTINCT c.author_id)::int FROM launch_comments c WHERE c.launch_id = l.id AND c.tried_it) AS tried_count,
            (SELECT MAX(c.created_at) FROM launch_comments c WHERE c.launch_id = l.id) AS last_comment_at,
            EXISTS (SELECT 1 FROM launch_comments c WHERE c.launch_id = l.id AND c.author_id = $1) AS you_joined
     FROM launches l
     JOIN startups s ON s.id = l.startup_id
     JOIN profiles p ON p.user_id = l.founder_id
     ${mine ? 'WHERE l.founder_id = $1' : ''}
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

  const comments = (await pool.query(
    `SELECT c.*, p.display_name, p.headline, p.profile_image, u.primary_role
     FROM launch_comments c
     JOIN profiles p ON p.user_id = c.author_id
     JOIN users u ON u.id = c.author_id
     WHERE c.launch_id = $1
     ORDER BY c.created_at ASC`,
    [launchId]
  )).rows;

  const updates = (await pool.query(
    `SELECT * FROM launch_updates WHERE launch_id = $1 ORDER BY created_at DESC`, [launchId]
  )).rows;

  // Flat replies attached to their parent, the same shape a circle thread
  // uses. Nesting deeper than one level makes a room tidy and kills it.
  const byParent = {};
  for (const c of comments.filter((x) => x.parent_id)) (byParent[c.parent_id] ||= []).push(c);
  const thread = comments
    .filter((c) => !c.parent_id)
    .map((c) => ({ ...c, replies: byParent[c.id] || [] }))
    .reverse();   // newest conversation first

  const people = new Set(comments.map((c) => c.author_id));
  const triedIt = new Set(comments.filter((c) => c.tried_it).map((c) => c.author_id));

  return {
    success: true,
    launch,
    thread,
    updates,
    isFounder: launch.founder_id === viewerId,
    youJoined: people.has(viewerId),
    counts: {
      comments: comments.length,
      people: people.size,
      tried: triedIt.size,
    },
  };
}

/**
 * Say something in the room. A reply is flat: replying to a reply attaches to
 * the same post, so the conversation stays readable.
 */
async function comment(userId, launchId, input = {}) {
  const l = await pool.query(`SELECT founder_id, closed_at, title FROM launches WHERE id = $1`, [launchId]);
  if (l.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  if (l.rows[0].closed_at) return { success: false, error: 'CLOSED' };

  const body = String(input.body || '').trim();
  if (body.length < 3) return { success: false, error: 'TOO_SHORT' };
  if (body.length > 4000) return { success: false, error: 'TOO_LONG' };

  let parentId = input.parentId || null;
  if (parentId) {
    const parent = await pool.query(
      `SELECT launch_id, parent_id FROM launch_comments WHERE id = $1`, [parentId]
    );
    if (parent.rows.length === 0) return { success: false, error: 'PARENT_NOT_FOUND' };
    if (parent.rows[0].launch_id !== launchId) return { success: false, error: 'PARENT_WRONG_LAUNCH' };
    if (parent.rows[0].parent_id) parentId = parent.rows[0].parent_id;   // keep it flat
  }

  const triedIt = typeof input.triedIt === 'boolean' ? input.triedIt : null;

  const r = await pool.query(
    `INSERT INTO launch_comments (launch_id, author_id, parent_id, body, tried_it)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [launchId, userId, parentId, body, triedIt]
  );

  // The founder hears when somebody says something, unless they said it.
  if (l.rows[0].founder_id !== userId) {
    createNotification(l.rows[0].founder_id, {
      type: 'LAUNCH_COMMENT',
      title: `Somebody is talking about ${l.rows[0].title}`,
      message: body.slice(0, 140),
      referenceType: 'LAUNCH',
      referenceId: launchId,
    }).catch(() => {});
  }

  // And whoever is being replied to hears it, if it is not their own reply.
  if (parentId) {
    const parentAuthor = await pool.query(
      `SELECT author_id FROM launch_comments WHERE id = $1`, [parentId]
    );
    const pa = parentAuthor.rows[0]?.author_id;
    if (pa && pa !== userId && pa !== l.rows[0].founder_id) {
      createNotification(pa, {
        type: 'LAUNCH_COMMENT',
        title: 'Somebody replied to you',
        message: body.slice(0, 140),
        referenceType: 'LAUNCH',
        referenceId: launchId,
      }).catch(() => {});
    }
  }

  return { success: true, comment: r.rows[0] };
}

/** The founder marking that a piece of feedback genuinely helped. */
async function markHelpful(userId, feedbackId) {
  const r = await pool.query(
    `UPDATE launch_comments c SET marked_helpful = NOT c.marked_helpful
     FROM launches l
     WHERE c.id = $1 AND l.id = c.launch_id AND l.founder_id = $2
     RETURNING c.marked_helpful, c.author_id AS user_id, l.title`,
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
    `SELECT DISTINCT author_id AS user_id FROM launch_comments WHERE launch_id = $1 AND author_id != $2`,
    [launchId, userId]
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
  createLaunch, updateLaunch, deleteLaunch, listLaunches, getLaunch, comment,
  markHelpful, postUpdate, closeLaunch,
};
