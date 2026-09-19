/**
 * Rooms.
 *
 * Every relationship in this product was one-to-one and private, and every
 * door was high-stakes: "build this with me for years" was the only available
 * interaction. Someone curious but not ready to commit had no way to engage.
 *
 * A room is a place to say what you are actually wrestling with, to people in
 * the same field who understand the decision. Founders and contributors mixed
 * deliberately, because a contributor's most valuable question is usually one
 * only a founder can answer.
 *
 * ROOMS ARE DERIVED, NOT STORED. There is no rooms table. A room is a domain
 * string that enough people share, computed from ventures and contributor
 * profiles. A venture in a domain nobody anticipated gets a room
 * automatically; a domain nobody uses stops appearing. No admin step, no
 * hardcoded list to go stale.
 */
const pool = require('../shared/db');

// A room appears once this many people are genuinely in its field. One person
// typing a new domain should not produce an empty room with themselves in it:
// that looks worse than the domain not existing.
const MIN_PEOPLE_FOR_ROOM = 2;

// "Around recently" for the presence line.
const ACTIVE_WINDOW_HOURS = 48;

/**
 * Every room that currently exists, with how alive each one is.
 *
 * Counts people in the field from BOTH sides: contributors who chose the
 * domain, and founders whose venture is in it. A room of only contributors
 * talking to each other would miss the entire point.
 */
async function listRooms(userId) {
  const result = await pool.query(
    `WITH domain_people AS (
       -- Contributors who said they care about this field.
       SELECT lower(trim(d)) AS room, p.user_id
       FROM contributor_profiles cp
       JOIN profiles p ON p.id = cp.profile_id
       CROSS JOIN LATERAL unnest(COALESCE(cp.preferred_domains, ARRAY[]::text[])) AS d
       WHERE length(trim(d)) > 0
       UNION
       -- Founders whose venture is in it.
       SELECT lower(trim(d)) AS room, s.founder_id AS user_id
       FROM startups s
       JOIN users u ON u.id = s.founder_id
       CROSS JOIN LATERAL unnest(COALESCE(s.domain, ARRAY[]::text[])) AS d
       WHERE length(trim(d)) > 0
         AND u.email != 'system.import@capforge.internal'
         AND s.verification_status != 'UNVERIFIED'
       UNION
       -- Investors who invest in it, so a room is not blind to the money side.
       SELECT lower(trim(d)) AS room, p.user_id
       FROM investor_profiles ip
       JOIN profiles p ON p.id = ip.profile_id
       CROSS JOIN LATERAL unnest(COALESCE(ip.preferred_domains, ARRAY[]::text[])) AS d
       WHERE length(trim(d)) > 0
     ),
     counted AS (
       SELECT room, COUNT(DISTINCT user_id)::int AS people
       FROM domain_people GROUP BY room
     )
     SELECT c.room, c.people,
            (SELECT COUNT(*)::int FROM room_posts rp WHERE rp.room = c.room) AS posts,
            (SELECT MAX(rp.created_at) FROM room_posts rp WHERE rp.room = c.room) AS last_post_at,
            (SELECT COUNT(*)::int FROM room_presence pr
             WHERE pr.room = c.room AND pr.last_seen_at > now() - interval '${ACTIVE_WINDOW_HOURS} hours') AS recently_around,
            EXISTS (SELECT 1 FROM domain_people dp WHERE dp.room = c.room AND dp.user_id = $1) AS yours
     FROM counted c
     WHERE c.people >= ${MIN_PEOPLE_FOR_ROOM}
     ORDER BY yours DESC, last_post_at DESC NULLS LAST, c.people DESC`,
    [userId]
  );

  return { success: true, rooms: result.rows };
}

/**
 * One room's posts, newest first, with their replies.
 *
 * Flat and chronological. No ranking, no score, nothing that reorders by
 * popularity, because a room that ranks its posts makes people write for the
 * room instead of saying what they mean.
 */
async function getRoom(room, userId, { limit = 50 } = {}) {
  const slug = String(room || '').toLowerCase().trim();
  if (!slug) return { success: false, error: 'NO_ROOM' };

  // Record that they were here. Fire-and-forget: reading a room must never
  // fail because presence did.
  pool.query(
    `INSERT INTO room_presence (room, user_id) VALUES ($1, $2)
     ON CONFLICT (room, user_id) DO UPDATE SET last_seen_at = now()`,
    [slug, userId]
  ).catch((err) => console.error('Room presence failed (non-fatal):', err.message));

  const posts = await pool.query(
    `SELECT rp.id, rp.body, rp.created_at, rp.edited_at, rp.author_id,
            p.display_name, p.headline, p.profile_image,
            u.primary_role,
            (SELECT COUNT(*)::int FROM room_post_helped h WHERE h.post_id = rp.id) AS helped,
            EXISTS (SELECT 1 FROM room_post_helped h WHERE h.post_id = rp.id AND h.user_id = $2) AS you_helped,
            (SELECT COUNT(*)::int FROM room_posts r2 WHERE r2.parent_id = rp.id) AS reply_count
     FROM room_posts rp
     JOIN profiles p ON p.user_id = rp.author_id
     JOIN users u ON u.id = rp.author_id
     WHERE rp.room = $1 AND rp.parent_id IS NULL
     ORDER BY rp.created_at DESC
     LIMIT $3`,
    [slug, userId, limit]
  );

  const ids = posts.rows.map((p) => p.id);
  let repliesByParent = {};
  if (ids.length > 0) {
    const replies = await pool.query(
      `SELECT rp.id, rp.parent_id, rp.body, rp.created_at, rp.author_id,
              p.display_name, p.headline, p.profile_image, u.primary_role,
              (SELECT COUNT(*)::int FROM room_post_helped h WHERE h.post_id = rp.id) AS helped,
              EXISTS (SELECT 1 FROM room_post_helped h WHERE h.post_id = rp.id AND h.user_id = $2) AS you_helped
       FROM room_posts rp
       JOIN profiles p ON p.user_id = rp.author_id
       JOIN users u ON u.id = rp.author_id
       WHERE rp.parent_id = ANY($1::uuid[])
       ORDER BY rp.created_at ASC`,
      [ids, userId]
    );
    for (const r of replies.rows) {
      (repliesByParent[r.parent_id] ||= []).push(r);
    }
  }

  const withReplies = posts.rows.map((p) => ({ ...p, replies: repliesByParent[p.id] || [] }));

  // Who was actually around. Not a member count: a room feels alive when you
  // can see someone else was here today.
  const around = await pool.query(
    `SELECT p.display_name, p.profile_image
     FROM room_presence pr
     JOIN profiles p ON p.user_id = pr.user_id
     WHERE pr.room = $1 AND pr.last_seen_at > now() - interval '${ACTIVE_WINDOW_HOURS} hours'
     ORDER BY pr.last_seen_at DESC LIMIT 8`,
    [slug]
  );

  // Posts nobody answered. Asking into silence is what kills a room, and this
  // is the one place a little logic genuinely helps: the people who could
  // answer should see it.
  const unanswered = withReplies.filter((p) => p.reply_count === 0 && p.author_id !== userId).slice(0, 3);

  return {
    success: true,
    room: slug,
    posts: withReplies,
    around: around.rows,
    unanswered,
  };
}

async function createPost(userId, room, body, parentId) {
  const slug = String(room || '').toLowerCase().trim();
  const text = String(body || '').trim();
  if (!slug) return { success: false, error: 'NO_ROOM' };
  if (!text) return { success: false, error: 'EMPTY' };
  if (text.length > 4000) return { success: false, error: 'TOO_LONG' };

  // A reply must belong to the room it claims, or a crafted request could
  // attach a reply to a post in a different room.
  if (parentId) {
    const parent = await pool.query(`SELECT room, parent_id FROM room_posts WHERE id = $1`, [parentId]);
    if (parent.rows.length === 0) return { success: false, error: 'PARENT_NOT_FOUND' };
    if (parent.rows[0].room !== slug) return { success: false, error: 'PARENT_WRONG_ROOM' };
    // Flat: a reply to a reply is still a reply to the post.
    if (parent.rows[0].parent_id) parentId = parent.rows[0].parent_id;
  }

  const result = await pool.query(
    `INSERT INTO room_posts (room, author_id, body, parent_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [slug, userId, text, parentId || null]
  );

  pool.query(
    `INSERT INTO room_presence (room, user_id) VALUES ($1, $2)
     ON CONFLICT (room, user_id) DO UPDATE SET last_seen_at = now()`,
    [slug, userId]
  ).catch(() => {});

  return { success: true, post: result.rows[0] };
}

/** "This helped." Toggles, so it can be taken back. */
async function toggleHelped(userId, postId) {
  const existing = await pool.query(
    `DELETE FROM room_post_helped WHERE post_id = $1 AND user_id = $2 RETURNING post_id`,
    [postId, userId]
  );
  if (existing.rows.length > 0) return { success: true, helped: false };

  const post = await pool.query(`SELECT id FROM room_posts WHERE id = $1`, [postId]);
  if (post.rows.length === 0) return { success: false, error: 'NOT_FOUND' };

  await pool.query(
    `INSERT INTO room_post_helped (post_id, user_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [postId, userId]
  );
  return { success: true, helped: true };
}

async function deletePost(userId, postId) {
  const r = await pool.query(
    `DELETE FROM room_posts WHERE id = $1 AND author_id = $2 RETURNING id`,
    [postId, userId]
  );
  if (r.rows.length === 0) return { success: false, error: 'NOT_YOURS' };
  return { success: true };
}

module.exports = { listRooms, getRoom, createPost, toggleHelped, deletePost };
