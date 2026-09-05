/**
 * Real notification preferences (Sprint 27) — Settings' toggles existed
 * visually before this with nothing persisting them. Now backed by an
 * actual table.
 */
const pool = require('../shared/db');

async function getPreferences(userId) {
  const result = await pool.query('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) {
    const created = await pool.query('INSERT INTO notification_preferences (user_id) VALUES ($1) RETURNING *', [userId]);
    return { success: true, preferences: created.rows[0] };
  }
  return { success: true, preferences: result.rows[0] };
}

async function updatePreferences(userId, updates) {
  const allowed = ['connections', 'recommendations', 'team_updates', 'ai_analysis'];
  const fields = Object.keys(updates).filter(k => allowed.includes(k));
  if (fields.length === 0) return { success: false, error: 'NO_VALID_FIELDS' };
  await getPreferences(userId); // ensure row exists
  const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const result = await pool.query(
    `UPDATE notification_preferences SET ${setClauses} WHERE user_id = $1 RETURNING *`,
    [userId, ...fields.map(f => updates[f])]
  );
  return { success: true, preferences: result.rows[0] };
}

module.exports = { getPreferences, updatePreferences };
