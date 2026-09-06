/**
 * Phase B — real chat/messaging. This is the actual mechanism behind
 * "Express Interest" (previously a toast with zero backend action) and
 * the general founder<->contributor / founder<->investor conversation
 * that has to happen before two people decide to work together.
 */
const pool = require('../shared/db');

/**
 * Real dedup logic: if a conversation already exists between these two
 * people (regardless of context), return it instead of creating a
 * duplicate thread every time someone clicks Express Interest again.
 */
async function startOrGetConversation(userId, otherUserId, { startupId, gapId } = {}) {
  if (userId === otherUserId) return { success: false, error: 'CANNOT_MESSAGE_SELF' };

  const existing = await pool.query(
    `SELECT * FROM conversations
     WHERE (participant_a_id = $1 AND participant_b_id = $2) OR (participant_a_id = $2 AND participant_b_id = $1)
     LIMIT 1`,
    [userId, otherUserId]
  );
  if (existing.rows.length > 0) return { success: true, conversation: existing.rows[0], isNew: false };

  const result = await pool.query(
    `INSERT INTO conversations (participant_a_id, participant_b_id, startup_id, gap_id) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, otherUserId, startupId || null, gapId || null]
  );
  return { success: true, conversation: result.rows[0], isNew: true };
}

async function sendMessage(conversationId, senderId, content) {
  if (!content || content.trim().length === 0) return { success: false, error: 'EMPTY_MESSAGE' };

  const convo = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
  if (convo.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const c = convo.rows[0];
  if (c.participant_a_id !== senderId && c.participant_b_id !== senderId) return { success: false, error: 'NOT_AUTHORIZED' };

  const result = await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *`,
    [conversationId, senderId, content.trim()]
  );
  await pool.query('UPDATE conversations SET last_message_at = now() WHERE id = $1', [conversationId]);
  return { success: true, message: result.rows[0] };
}

async function getMyConversations(userId) {
  const result = await pool.query(
    `SELECT c.*, 
            CASE WHEN c.participant_a_id = $1 THEN c.participant_b_id ELSE c.participant_a_id END as other_user_id,
            p.display_name as other_display_name, p.headline as other_headline,
            s.name as startup_name,
            (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != $1 AND read_at IS NULL) as unread_count
     FROM conversations c
     JOIN profiles p ON p.user_id = (CASE WHEN c.participant_a_id = $1 THEN c.participant_b_id ELSE c.participant_a_id END)
     LEFT JOIN startups s ON s.id = c.startup_id
     WHERE c.participant_a_id = $1 OR c.participant_b_id = $1
     ORDER BY c.last_message_at DESC`,
    [userId]
  );
  return { success: true, conversations: result.rows };
}

async function getMessages(conversationId, userId) {
  const convo = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
  if (convo.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const c = convo.rows[0];
  if (c.participant_a_id !== userId && c.participant_b_id !== userId) return { success: false, error: 'NOT_AUTHORIZED' };

  const result = await pool.query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC', [conversationId]);
  // Real read-receipt behavior: mark the other participant's messages read when this user opens the thread.
  await pool.query('UPDATE messages SET read_at = now() WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL', [conversationId, userId]);
  return { success: true, messages: result.rows, conversation: c };
}

module.exports = { startOrGetConversation, sendMessage, getMyConversations, getMessages };
