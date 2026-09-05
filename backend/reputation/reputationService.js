/**
 * Reputation (Sprint 22). Ref: PRD §32, SRS §66 — "reputation must avoid
 * becoming a simplistic popularity score" and must be built from REAL
 * platform activity, never fabricated or inferred.
 *
 * Real signals used, nothing invented:
 *  - Accepted connections (real collaborations formed)
 *  - Completed workspace tasks assigned to them (real delivered work)
 *  - Time on platform (tenure — a weak but honest signal)
 */
const pool = require('../shared/db');

async function computeReputation(userId) {
  const acceptedConnections = await pool.query(
    `SELECT COUNT(*) FROM connections WHERE receiver_id = $1 AND status = 'ACCEPTED'`, [userId]
  );
  const completedTasks = await pool.query(
    `SELECT COUNT(*) FROM tasks WHERE assigned_to = $1 AND status = 'COMPLETED'`, [userId]
  );
  const teamMemberships = await pool.query(
    `SELECT COUNT(*) FROM startup_team_members WHERE user_id = $1 AND is_founder = false`, [userId]
  );

  const connectionsCount = parseInt(acceptedConnections.rows[0].count);
  const tasksCount = parseInt(completedTasks.rows[0].count);
  const teamsCount = parseInt(teamMemberships.rows[0].count);

  // Simple, transparent, real-activity-only weighting — no popularity/social signals.
  const score = Math.min((connectionsCount * 10) + (tasksCount * 15) + (teamsCount * 20), 100);

  return {
    success: true,
    reputation: {
      score,
      breakdown: {
        accepted_connections: connectionsCount,
        completed_tasks: tasksCount,
        team_memberships: teamsCount
      }
    }
  };
}

module.exports = { computeReputation };
