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

/**
 * Real, comprehensive platform health check — every single check here
 * is drawn directly from an actual, confirmed bug found and fixed
 * during this build, not a hypothetical. Converts 'the founder
 * discovers matching is broken by staring at Opportunities' into
 * 'the platform tells someone matching is broken, here's exactly
 * what and why' — the actual point of this feature.
 */
async function runIntegrityCheck() {
  const REAL_FILTER = `u.email != 'system.import@capforge.internal' AND s.verification_status != 'UNVERIFIED'`;

  const [orphanedRecs, filledGapRecs, missingContribProfiles, missingInvestorProfiles,
         deadCriticalGaps, noReadiness, blankProfiles, leakedSystemRecs] = await Promise.all([
    // Confirmed bug: recommendations left ACTIVE after their gap was deleted (ON DELETE SET NULL).
    pool.query(`SELECT COUNT(*) FROM recommendations WHERE status = 'ACTIVE' AND source_gap_id IS NULL`),

    // Confirmed bug: recommendations still ACTIVE for a gap that's since been FILLED (e.g. NeuraHealth AI/ML Engineer).
    pool.query(`SELECT COUNT(*), array_agg(DISTINCT g.role) as roles FROM recommendations r JOIN gaps g ON g.id = r.source_gap_id WHERE r.status = 'ACTIVE' AND g.status = 'FILLED'`),

    // Confirmed bug: 17 of 25 contributors had skills but no contributor_profiles row at all — invisible to matching.
    pool.query(`SELECT COUNT(*), array_agg(u.email) as emails FROM profiles p JOIN users u ON u.id = p.user_id LEFT JOIN contributor_profiles cp ON cp.profile_id = p.id WHERE u.primary_role = 'CONTRIBUTOR' AND cp.id IS NULL`),

    // Same class of bug, investor side.
    pool.query(`SELECT COUNT(*), array_agg(u.email) as emails FROM profiles p JOIN users u ON u.id = p.user_id LEFT JOIN investor_profiles ip ON ip.profile_id = p.id WHERE u.primary_role = 'INVESTOR' AND ip.id IS NULL`),

    // Real, currently-open CRITICAL gaps on real claimed startups with zero active candidates at all.
    pool.query(`SELECT COUNT(*), array_agg(s.name || ' — ' || g.role) as items FROM gaps g JOIN startups s ON s.id = g.startup_id JOIN users u ON u.id = s.founder_id
                WHERE g.status NOT IN ('FILLED', 'DISMISSED') AND g.priority_level = 'CRITICAL' AND ${REAL_FILTER}
                  AND NOT EXISTS (SELECT 1 FROM recommendations r WHERE r.source_gap_id = g.id AND r.status = 'ACTIVE')`),

    // Confirmed bug: a startup with no readiness assessment is structurally invisible to every investor.
    pool.query(`SELECT COUNT(*), array_agg(s.name) as names FROM startups s JOIN users u ON u.id = s.founder_id
                WHERE ${REAL_FILTER} AND NOT EXISTS (SELECT 1 FROM readiness_assessments ra WHERE ra.startup_id = s.id)`),

    // Confirmed issue: an account with a blank headline/bio can't be evaluated by anyone deciding whether to reach out.
    pool.query(`SELECT COUNT(*), array_agg(u.email) as emails FROM profiles p JOIN users u ON u.id = p.user_id
                WHERE u.email != 'system.import@capforge.internal' AND (p.headline IS NULL OR p.headline = '' OR p.bio IS NULL OR p.bio = '')`),

    // Defense-in-depth: confirms the system-import exclusion is actually holding, not just assumed.
    pool.query(`SELECT COUNT(*) FROM recommendations r JOIN startups s ON s.id = r.startup_id JOIN users u ON u.id = s.founder_id
                WHERE r.status = 'ACTIVE' AND (u.email = 'system.import@capforge.internal' OR s.verification_status = 'UNVERIFIED')`),
  ]);

  return {
    success: true,
    checks: [
      { id: 'orphaned_recommendations', label: 'Recommendations pointing at deleted gaps', count: parseInt(orphanedRecs.rows[0].count), severity: 'high', fixable: true },
      { id: 'filled_gap_recommendations', label: 'Recommendations still active for a filled gap', count: parseInt(filledGapRecs.rows[0].count), detail: filledGapRecs.rows[0].roles, severity: 'high', fixable: true },
      { id: 'missing_contributor_profiles', label: 'Contributors invisible to matching (no availability/domain data)', count: parseInt(missingContribProfiles.rows[0].count), detail: missingContribProfiles.rows[0].emails, severity: 'critical', fixable: false },
      { id: 'missing_investor_profiles', label: 'Investors invisible to matching (no thesis data)', count: parseInt(missingInvestorProfiles.rows[0].count), detail: missingInvestorProfiles.rows[0].emails, severity: 'critical', fixable: false },
      { id: 'dead_critical_gaps', label: 'Critical gaps with zero real candidates', count: parseInt(deadCriticalGaps.rows[0].count), detail: deadCriticalGaps.rows[0].items, severity: 'medium', fixable: false },
      { id: 'no_readiness', label: 'Real startups with no readiness score (invisible to investors)', count: parseInt(noReadiness.rows[0].count), detail: noReadiness.rows[0].names, severity: 'high', fixable: false },
      { id: 'blank_profiles', label: 'Accounts with a blank headline or bio', count: parseInt(blankProfiles.rows[0].count), detail: blankProfiles.rows[0].emails, severity: 'low', fixable: false },
      { id: 'leaked_system_recs', label: 'System-import/unverified startups leaking into real recommendations', count: parseInt(leakedSystemRecs.rows[0].count), severity: 'critical', fixable: true },
    ]
  };
}

/** Real, one-click fixes for the checks that are pure cleanup, not judgment calls. */
async function fixIntegrityIssue(checkId) {
  if (checkId === 'orphaned_recommendations') {
    const r = await pool.query(`UPDATE recommendations SET status = 'EXPIRED' WHERE status = 'ACTIVE' AND source_gap_id IS NULL RETURNING id`);
    return { success: true, fixed: r.rows.length };
  }
  if (checkId === 'filled_gap_recommendations') {
    const r = await pool.query(`UPDATE recommendations SET status = 'EXPIRED' WHERE id IN (SELECT r.id FROM recommendations r JOIN gaps g ON g.id = r.source_gap_id WHERE r.status = 'ACTIVE' AND g.status = 'FILLED') RETURNING id`);
    return { success: true, fixed: r.rows.length };
  }
  if (checkId === 'leaked_system_recs') {
    const r = await pool.query(`UPDATE recommendations SET status = 'EXPIRED' WHERE id IN (SELECT r.id FROM recommendations r JOIN startups s ON s.id = r.startup_id JOIN users u ON u.id = s.founder_id WHERE r.status = 'ACTIVE' AND (u.email = 'system.import@capforge.internal' OR s.verification_status = 'UNVERIFIED')) RETURNING id`);
    return { success: true, fixed: r.rows.length };
  }
  return { success: false, error: 'NOT_FIXABLE_AUTOMATICALLY' };
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

module.exports = { listAllUsers, listAllStartups, setVerificationStatus, getPlatformStats, setUserStatus, setUserAdmin, deleteStartup, runIntegrityCheck, fixIntegrityIssue };
