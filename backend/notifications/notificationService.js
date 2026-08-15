/**
 * Notification System. Ref: TRD §39-40, SRS §59-60, App Flow §8.
 * Deliberately simple and synchronous for this sprint's scope — real
 * events generate real persisted notifications. No push/email delivery
 * yet (that's infrastructure, not core product logic; explicitly out
 * of the 30-35 day core scope per the PRD's future-expansion section).
 */
const pool = require('../shared/db');

async function createNotification(userId, { type, title, message, referenceType, referenceId }) {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, type, title, message, referenceType || null, referenceId || null]
  );
  return result.rows[0];
}

async function getNotifications(userId, { unreadOnly } = {}) {
  const clause = unreadOnly ? 'AND is_read = false' : '';
  const result = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ${clause} ORDER BY created_at DESC LIMIT 100`,
    [userId]
  );
  return { success: true, notifications: result.rows };
}

async function markAsRead(notificationId, userId) {
  const result = await pool.query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
    [notificationId, userId]
  );
  if (result.rows.length === 0) return { success: false, error: 'NOT_FOUND_OR_UNAUTHORIZED' };
  return { success: true, notification: result.rows[0] };
}

async function markAllAsRead(userId) {
  await pool.query(`UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`, [userId]);
  return { success: true };
}

module.exports = { createNotification, getNotifications, markAsRead, markAllAsRead };
