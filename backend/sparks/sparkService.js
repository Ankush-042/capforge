/**
 * Phase 2: The First Act.
 *
 * A spark is the moment before a startup exists. Everything else in this
 * codebase operates on a structured venture that already has a name, a
 * domain, diagnosed gaps and a readiness score. A spark has none of that on
 * purpose. It is one person's raw statement of what they want to build,
 * published before it is anything official.
 *
 * The founding moment is when a second person reads it and commits. At that
 * point, and only then, the spark becomes a real startup and the existing
 * AI structuring pipeline runs for the first time, with the co-founder
 * seeded onto the team from day one rather than "hired" afterward through
 * gap diagnosis like every other role.
 */
const pool = require('./../shared/db');
const { startOrGetConversation } = require('../conversations/conversationService');
const { createNotification } = require('../notifications/notificationService');

async function createSpark(userId, { title, theIdea, whyMe, lookingFor, tags }) {
  if (!title || !title.trim()) return { success: false, error: 'TITLE_REQUIRED' };
  if (!theIdea || theIdea.trim().length < 40) return { success: false, error: 'IDEA_TOO_SHORT' };

  const result = await pool.query(
    `INSERT INTO sparks (author_id, title, the_idea, why_me, looking_for, tags)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, title.trim(), theIdea.trim(), whyMe?.trim() || null, lookingFor?.trim() || null, tags || []]
  );
  return { success: true, spark: result.rows[0] };
}

/**
 * The spark feed. Deliberately NOT ranked by a matching score: this is
 * vision-first browsing, not skill-matched browsing. Ordering is recency and
 * genuine activity, so a raw idea posted today is as visible as a polished one.
 */
async function listSparks({ viewerId, tag, limit = 40 } = {}) {
  const params = [];
  let where = `s.status IN ('OPEN', 'FORMING')`;
  if (tag) { params.push(tag); where += ` AND $${params.length} = ANY(s.tags)`; }

  params.push(limit);
  const result = await pool.query(
    `SELECT s.*, p.display_name AS author_name, p.headline AS author_headline,
            (SELECT COUNT(*) FROM spark_resonances r WHERE r.spark_id = s.id) AS resonance_count,
            ${viewerId ? `EXISTS(SELECT 1 FROM spark_resonances r2 WHERE r2.spark_id = s.id AND r2.user_id = '${viewerId}')` : 'false'} AS viewer_resonated
     FROM sparks s
     JOIN profiles p ON p.user_id = s.author_id
     WHERE ${where}
     ORDER BY s.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return { success: true, sparks: result.rows };
}

async function getSpark(sparkId, viewerId) {
  const result = await pool.query(
    `SELECT s.*, p.display_name AS author_name, p.headline AS author_headline, p.bio AS author_bio
     FROM sparks s JOIN profiles p ON p.user_id = s.author_id
     WHERE s.id = $1`,
    [sparkId]
  );
  if (result.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const spark = result.rows[0];

  if (viewerId && viewerId !== spark.author_id) {
    pool.query(`UPDATE sparks SET view_count = view_count + 1 WHERE id = $1`, [sparkId]).catch(() => {});
  }

  // The author sees who resonated. Others only see their own resonance.
  const resonances = await pool.query(
    `SELECT r.*, p.display_name, p.headline FROM spark_resonances r
     JOIN profiles p ON p.user_id = r.user_id
     WHERE r.spark_id = $1 ${viewerId === spark.author_id ? '' : 'AND r.user_id = $2'}
     ORDER BY r.created_at DESC`,
    viewerId === spark.author_id ? [sparkId] : [sparkId, viewerId || null]
  );

  return { success: true, spark, resonances: resonances.rows, isAuthor: viewerId === spark.author_id };
}

/**
 * Resonance, not application. No ranking, no accept/reject. It opens a real
 * conversation immediately, because the entire point of the First Act is two
 * people talking, not one person screening the other.
 */
async function resonate(sparkId, userId, message) {
  if (!message || message.trim().length < 20) return { success: false, error: 'MESSAGE_TOO_SHORT' };

  const sparkRes = await pool.query(`SELECT * FROM sparks WHERE id = $1`, [sparkId]);
  if (sparkRes.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const spark = sparkRes.rows[0];
  if (spark.author_id === userId) return { success: false, error: 'CANNOT_RESONATE_OWN_SPARK' };
  if (spark.status === 'FORMED') return { success: false, error: 'ALREADY_FORMED' };

  const existing = await pool.query(`SELECT * FROM spark_resonances WHERE spark_id = $1 AND user_id = $2`, [sparkId, userId]);
  if (existing.rows.length > 0) return { success: false, error: 'ALREADY_RESONATED' };

  const convo = await startOrGetConversation(userId, spark.author_id, {});
  if (!convo.success) return convo;

  await pool.query(`UPDATE conversations SET spark_id = $1 WHERE id = $2`, [sparkId, convo.conversation.id]);
  await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3)`,
    [convo.conversation.id, userId, message.trim()]
  );
  await pool.query(`UPDATE conversations SET last_message_at = now() WHERE id = $1`, [convo.conversation.id]);

  const result = await pool.query(
    `INSERT INTO spark_resonances (spark_id, user_id, message, conversation_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [sparkId, userId, message.trim(), convo.conversation.id]
  );

  createNotification(spark.author_id, {
    type: 'SPARK_RESONANCE',
    title: 'Someone believes in your idea',
    message: `Someone wants to build "${spark.title}" with you.`,
    referenceType: 'SPARK',
    referenceId: sparkId,
  }).catch(() => {});

  return { success: true, resonance: result.rows[0], conversationId: convo.conversation.id };
}

/**
 * The actual founding moment. When both sides commit, the spark stops being
 * an idea and becomes a real venture: the existing structuring pipeline runs
 * for the first time, and the co-founder is on the team from day one.
 */
async function commitToSpark(sparkId, userId) {
  const sparkRes = await pool.query(`SELECT * FROM sparks WHERE id = $1`, [sparkId]);
  if (sparkRes.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const spark = sparkRes.rows[0];
  if (spark.status === 'FORMED') return { success: false, error: 'ALREADY_FORMED' };

  const isAuthor = spark.author_id === userId;
  const column = isAuthor ? 'author_committed' : 'responder_committed';

  const resonanceRes = isAuthor
    ? await pool.query(`SELECT * FROM spark_resonances WHERE spark_id = $1 ORDER BY created_at ASC LIMIT 1`, [sparkId])
    : await pool.query(`SELECT * FROM spark_resonances WHERE spark_id = $1 AND user_id = $2`, [sparkId, userId]);

  if (resonanceRes.rows.length === 0) return { success: false, error: 'NO_RESONANCE_YET' };
  const resonance = resonanceRes.rows[0];

  const updated = await pool.query(
    `UPDATE spark_resonances SET ${column} = true WHERE id = $1 RETURNING *`,
    [resonance.id]
  );
  const r = updated.rows[0];

  if (!(r.author_committed && r.responder_committed)) {
    await pool.query(`UPDATE sparks SET status = 'FORMING', updated_at = now() WHERE id = $1`, [sparkId]);
    const otherUserId = isAuthor ? r.user_id : spark.author_id;
    createNotification(otherUserId, {
      type: 'SPARK_COMMIT',
      title: 'They are ready to build',
      message: `Your co-founder is ready to build "${spark.title}". Commit to make it real.`,
      referenceType: 'SPARK',
      referenceId: sparkId,
    }).catch(() => {});
    return { success: true, formed: false, awaitingOther: true };
  }

  // Both committed. This is the founding moment.
  return { success: true, formed: true, bothCommitted: true, spark, coFounderId: r.user_id };
}

async function getMySparks(userId) {
  const authored = await pool.query(
    `SELECT s.*, (SELECT COUNT(*) FROM spark_resonances r WHERE r.spark_id = s.id) AS resonance_count
     FROM sparks s WHERE s.author_id = $1 ORDER BY s.created_at DESC`,
    [userId]
  );
  const resonated = await pool.query(
    `SELECT s.*, r.message AS my_message, r.author_committed, r.responder_committed, r.conversation_id,
            p.display_name AS author_name
     FROM spark_resonances r
     JOIN sparks s ON s.id = r.spark_id
     JOIN profiles p ON p.user_id = s.author_id
     WHERE r.user_id = $1 ORDER BY r.created_at DESC`,
    [userId]
  );
  return { success: true, authored: authored.rows, resonated: resonated.rows };
}

module.exports = { createSpark, listSparks, getSpark, resonate, commitToSpark, getMySparks };
