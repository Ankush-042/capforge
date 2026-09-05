/**
 * Admin & Moderation (Sprint 23). Ref: PRD §Trust Layer, SRS §Admin.
 */
const pool = require('../shared/db');

async function listAllUsers() {
  const result = await pool.query(
    `SELECT u.id, u.email, u.primary_role, u.status, u.created_at, p.display_name
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id ORDER BY u.created_at DESC LIMIT 200`
  );
  return { success: true, users: result.rows };
}

async function listAllStartups() {
  const result = await pool.query(
    `SELECT id, name, founder_id, status, visibility, verification_status, stage, created_at
     FROM startups ORDER BY created_at DESC LIMIT 200`
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

module.exports = { listAllUsers, listAllStartups, setVerificationStatus, getPlatformStats };
