/**
 * Admin & Moderation (Sprint 23). Ref: PRD §Trust Layer, SRS §Admin.
 */
const pool = require('../shared/db');

async function listAllUsers(search) {
  const params = [];
  let where = '';
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where = `WHERE LOWER(u.email) LIKE $1 OR LOWER(p.display_name) LIKE $1`;
  }
  const result = await pool.query(
    `SELECT u.id, u.email, u.primary_role, u.status, u.is_admin, u.created_at, p.display_name
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id ${where} ORDER BY u.created_at DESC LIMIT 200`,
    params
  );
  return { success: true, users: result.rows };
}

async function listAllStartups(search) {
  const params = [];
  let where = '';
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where = `WHERE LOWER(name) LIKE $1`;
  }
  const result = await pool.query(
    `SELECT id, name, founder_id, status, visibility, verification_status, stage, created_at
     FROM startups ${where} ORDER BY created_at DESC LIMIT 200`,
    params
  );
  return { success: true, startups: result.rows };
}

async function setVerificationStatus(startupId, status) {
  const valid = ['CLAIMED', 'PENDING_VERIFICATION', 'VERIFIED', 'UNVERIFIED'];
  if (!valid.includes(status)) return { success: false, error: 'INVALID_STATUS' };
  const result = await pool.query(
    `UPDATE startups SET verification_status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [status, startupId]
  );
  if (result.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  return { success: true, startup: result.rows[0] };
}

/**
 * Real admin actions — the actual missing capability that made the
 * admin panel feel static (confirmed directly: Users tab had zero
 * actions, Startups tab had one narrow one-way 'Approve' button).
 */
async function setUserStatus(userId, status, requestingAdminId) {
  const valid = ['ACTIVE', 'SUSPENDED'];
  if (!valid.includes(status)) return { success: false, error: 'INVALID_STATUS' };
  if (userId === requestingAdminId) return { success: false, error: 'CANNOT_MODIFY_SELF' };
  const result = await pool.query(`UPDATE users SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, email, status`, [status, userId]);
  if (result.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  return { success: true, user: result.rows[0] };
}

async function setUserAdmin(userId, isAdmin, requestingAdminId) {
  if (userId === requestingAdminId) return { success: false, error: 'CANNOT_MODIFY_SELF' };
  const result = await pool.query(`UPDATE users SET is_admin = $1, updated_at = now() WHERE id = $2 RETURNING id, email, is_admin`, [isAdmin, userId]);
  if (result.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  return { success: true, user: result.rows[0] };
}

async function deleteStartup(startupId) {
  const result = await pool.query(`DELETE FROM startups WHERE id = $1 RETURNING id, name`, [startupId]);
  if (result.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  return { success: true, deleted: result.rows[0] };
}

async function getPlatformStats() {
  const [users, startups, connections, gaps] = await Promise.all([
    pool.query(`SELECT primary_role, COUNT(*) FROM users GROUP BY primary_role`),
    pool.query(`SELECT status, COUNT(*) FROM startups GROUP BY status`),
    pool.query(`SELECT status, COUNT(*) FROM connections GROUP BY status`),
    pool.query(`SELECT priority_level, COUNT(*) FROM gaps GROUP BY priority_level`),
  ]);
  return {
    success: true,
    stats: {
      users_by_role: users.rows,
      startups_by_status: startups.rows,
      connections_by_status: connections.rows,
      gaps_by_priority: gaps.rows
    }
  };
}

module.exports = { listAllUsers, listAllStartups, setVerificationStatus, getPlatformStats, setUserStatus, setUserAdmin, deleteStartup };
