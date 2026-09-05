/**
 * Phase 3 — the unified diagnosis-backed venture summary (Objective 3).
 * Ref: PPT — "Investor view renders the SAME dimensions for every
 * venture, enabling side-by-side screening." This did not exist as a
 * single artifact before — investor-facing data was scattered across
 * separate screens/components. This is the one coherent, comparable
 * object every venture produces the same shape of.
 */
const pool = require('../shared/db');
const { getLatestReadiness, getRisks } = require('./readinessService');

async function getVentureSummary(startupId) {
  const startupResult = await pool.query('SELECT * FROM startups WHERE id = $1', [startupId]);
  if (startupResult.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const startup = startupResult.rows[0];

  const [readinessResult, risksResult, gapsResult] = await Promise.all([
    getLatestReadiness(startupId),
    getRisks(startupId),
    pool.query('SELECT priority_level, status FROM gaps WHERE startup_id = $1', [startupId])
  ]);

  const gaps = gapsResult.rows;
  const gapCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  let filledCount = 0;
  for (const g of gaps) {
    if (g.status === 'FILLED') filledCount++;
    else gapCounts[g.priority_level] = (gapCounts[g.priority_level] || 0) + 1;
  }

  return {
    success: true,
    summary: {
      startup_id: startup.id,
      name: startup.name,
      problem: startup.problem,
      solution: startup.solution,
      domain: startup.domain,
      stage: startup.stage,
      verification_status: startup.verification_status,
      readiness: readinessResult.success ? {
        overall_score: readinessResult.readiness.overall_score,
        dimensions: readinessResult.readiness.dimensions,
        dimension_justifications: readinessResult.readiness.dimension_justifications
      } : null,
      top_risks: risksResult.success ? risksResult.risks.slice(0, 3) : [],
      team_coverage: {
        roles_filled: filledCount,
        roles_open: gaps.length - filledCount,
        open_by_priority: gapCounts
      },
      generated_at: new Date().toISOString()
    }
  };
}

module.exports = { getVentureSummary };
