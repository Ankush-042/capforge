const pool = require('./db');

/**
 * Track when someone was last here, so the product can tell them what changed.
 *
 * TWO TIMESTAMPS, DELIBERATELY.
 * last_seen_at moves continuously. previous_session_at is the stable point
 * everything is measured against, and only moves when someone returns after a
 * real gap. A single timestamp updated on every request would make "since you
 * were last here" mean "since a moment ago", which is always nothing.
 *
 * SESSION_GAP is the threshold for "you went away and came back". Thirty
 * minutes: long enough that clicking between pages does not reset the
 * reference point mid-visit, short enough that coming back after lunch shows
 * you what happened.
 *
 * Fire-and-forget on purpose. This is a nicety, and a failure to record a
 * timestamp must never slow down or break an actual request.
 */
const SESSION_GAP_MINUTES = 30;

function touchSession(req, res, next) {
  const userId = req.user?.userId;
  if (!userId) return next();

  pool.query(
    `UPDATE users
     SET previous_session_at = CASE
           WHEN last_seen_at IS NULL THEN last_seen_at
           WHEN last_seen_at < now() - interval '${SESSION_GAP_MINUTES} minutes' THEN last_seen_at
           ELSE previous_session_at
         END,
         last_seen_at = now()
     WHERE id = $1`,
    [userId]
  ).catch((err) => console.error('Session touch failed (non-fatal):', err.message));

  next();
}

module.exports = { touchSession, SESSION_GAP_MINUTES };
