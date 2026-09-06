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
  if (existing.rows.length > 0) {
    const existingConvo = existing.rows[0];
    // Real fix: if this conversation was started before it had any real
    // venture context (e.g. via the ProfileView bug where 'Message'
    // passed nothing), and real context is now available, backfill it
    // rather than leaving the conversation permanently context-less.
    if (!existingConvo.startup_id && startupId) {
      const updated = await pool.query(
        `UPDATE conversations SET startup_id = $1, gap_id = $2 WHERE id = $3 RETURNING *`,
        [startupId, gapId || null, existingConvo.id]
      );
      return { success: true, conversation: updated.rows[0], isNew: false };
    }
    return { success: true, conversation: existingConvo, isNew: false };
  }

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

  // Real fix: the frontend previously had to guess which confirm
  // column ('founder_confirmed' vs 'other_confirmed') applied to the
  // requesting user, without knowing who the actual founder is —
  // computed here correctly instead, once.
  let isFounderSide = false, myConfirmed = false;
  if (c.startup_id) {
    const startupResult = await pool.query('SELECT founder_id FROM startups WHERE id = $1', [c.startup_id]);
    isFounderSide = startupResult.rows[0]?.founder_id === userId;
    myConfirmed = isFounderSide ? c.founder_confirmed : c.other_confirmed;
  }

  return { success: true, messages: result.rows, conversation: { ...c, isFounderSide, myConfirmed } };
}

const { addContributorToTeam } = require('../connections/connectionService');
const { createNotification } = require('../notifications/notificationService');

/**
 * Phase D — the real mutual-confirm mechanism. This is what actually
 * gates team-join propagation now: BOTH people in a conversation must
 * independently confirm, not one person clicking accept/reject on the
 * other's behalf. Uses the SAME tested addContributorToTeam() function
 * the old instant-accept flow used — real, proven propagation logic,
 * just correctly gated behind a genuine two-sided human decision.
 */
async function confirmTeamFormation(conversationId, userId) {
  const convo = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
  if (convo.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const c = convo.rows[0];

  if (c.participant_a_id !== userId && c.participant_b_id !== userId) return { success: false, error: 'NOT_AUTHORIZED' };
  if (c.team_formed_at) return { success: false, error: 'ALREADY_FORMED' };
  if (!c.startup_id) return { success: false, error: 'NO_VENTURE_CONTEXT', detail: 'This conversation isn\'t tied to a specific venture — team formation needs that context.' };

  // Determine which side of the conversation this user is on: the
  // founder (owns the startup) or the other party (the contributor).
  const startupResult = await pool.query('SELECT founder_id FROM startups WHERE id = $1', [c.startup_id]);
  if (startupResult.rows.length === 0) return { success: false, error: 'STARTUP_NOT_FOUND' };
  const isFounder = startupResult.rows[0].founder_id === userId;

  const column = isFounder ? 'founder_confirmed' : 'other_confirmed';
  const updated = await pool.query(`UPDATE conversations SET ${column} = true WHERE id = $1 RETURNING *`, [conversationId]);
  const updatedConvo = updated.rows[0];

  if (!updatedConvo.founder_confirmed || !updatedConvo.other_confirmed) {
    // Only one side has confirmed so far — real, honest partial state.
    const otherUserId = isFounder ? c.participant_b_id : c.participant_a_id;
    await createNotification(otherUserId, {
      type: 'TEAM_CONFIRM_PENDING',
      title: 'Ready to form a team?',
      message: 'The other person confirmed they want to move forward — your confirmation is the last step.',
      referenceType: 'conversation',
      referenceId: conversationId
    });
    return { success: true, bothConfirmed: false, conversation: updatedConvo };
  }

  // Both sides confirmed — this is the real moment team-join propagation fires.
  const contributorUserId = isFounder ? c.participant_b_id : c.participant_a_id;
  const teamResult = await addContributorToTeam(c.startup_id, contributorUserId, c.gap_id);
  if (!teamResult.success) return { success: false, error: teamResult.error, detail: teamResult.detail };

  await pool.query('UPDATE conversations SET team_formed_at = now() WHERE id = $1', [conversationId]);

  return { success: true, bothConfirmed: true, conversation: updatedConvo, propagation: teamResult.propagation };
}

module.exports = { startOrGetConversation, sendMessage, getMyConversations, getMessages, confirmTeamFormation };
