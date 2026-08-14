/**
 * AI-09 — Readiness Engine + AI-08 — Risk Engine.
 * Ref: AI/Intelligence spec §24-31, TRD §27-29.
 *
 * Deterministic, explainable, weighted-dimension model (AI spec §26).
 * Readiness != inverse of Risk — computed independently per §28.
 */
const pool = require('../shared/db');

const READINESS_WEIGHTS = {
  team: 0.25, problem: 0.15, solution: 0.15,
  market: 0.15, execution: 0.15, technical: 0.10, business: 0.05
};

const CONFIDENCE_TO_SCORE = { high: 0.9, medium: 0.6, low: 0.3 };
const STAGE_TO_EXECUTION_SCORE = { 'Idea': 0.3, 'Prototype': 0.5, 'MVP': 0.7, 'Early Traction': 0.9, 'Unclear': 0.2 };

/**
 * Pure function: computes readiness dimensions from structured startup
 * state + gap coverage. Testable in isolation (TRD §92).
 */
function computeReadiness(startup, gaps) {
  const confidence = startup.confidence || {};

  // TEAM: average coverage across all diagnosed role requirements.
  const teamScore = gaps.length > 0
    ? gaps.reduce((sum, g) => sum + parseFloat(g.coverage), 0) / gaps.length
    : 0.5; // no gaps diagnosed yet — neutral, not fabricated confidence

  const problemScore = CONFIDENCE_TO_SCORE[confidence.problem] ?? 0.5;
  const solutionScore = CONFIDENCE_TO_SCORE[confidence.solution] ?? 0.5;

  // MARKET: heuristic v1 — presence of defined target users + domain.
  // Documented approximation, not a claim of market validation (AI spec §74).
  const hasTargetUsers = (startup.target_users || []).length > 0;
  const hasDomain = (startup.domain || []).length > 0;
  const marketScore = (hasTargetUsers ? 0.5 : 0) + (hasDomain ? 0.5 : 0);

  const executionScore = STAGE_TO_EXECUTION_SCORE[startup.stage] ?? 0.3;

  // TECHNICAL: coverage specifically of technically-flagged roles, if any
  // technology_requirements exist; otherwise neutral (non-technical venture).
  const hasTechRequirements = (startup.technology_requirements || []).length > 0;
  const technicalScore = hasTechRequirements ? teamScore : 0.6;

  const businessScore = (startup.business_model || []).length > 0 ? 0.7 : 0.3;

  const dimensions = {
    team: round2(teamScore), problem: round2(problemScore), solution: round2(solutionScore),
    market: round2(marketScore), execution: round2(executionScore),
    technical: round2(technicalScore), business: round2(businessScore)
  };

  const overall = Object.keys(READINESS_WEIGHTS).reduce(
    (sum, dim) => sum + dimensions[dim] * READINESS_WEIGHTS[dim], 0
  );

  const criticalIssues = [];
  if (dimensions.team < 0.4) criticalIssues.push('Team lacks coverage for one or more critical roles.');
  if (dimensions.business < 0.4) criticalIssues.push('Business model is not yet defined.');
  if (dimensions.market < 0.4) criticalIssues.push('Target users or domain are not yet clearly defined.');

  const topActions = gaps
    .filter(g => g.priority_level === 'CRITICAL' || g.priority_level === 'HIGH')
    .slice(0, 3)
    .map(g => `Address the "${g.role}" gap (${g.priority_level.toLowerCase()} priority).`);

  return {
    overall_score: Math.round(overall * 100),
    dimensions,
    critical_issues: criticalIssues,
    top_actions: topActions
  };
}

/**
 * AI-08 Risk Engine — rule-based checks (AI spec §29-30). Independent
 * from readiness: a startup can be readiness-70 with one severe risk.
 */
function computeRisks(startup, gaps) {
  const risks = [];

  const criticalGaps = gaps.filter(g => g.priority_level === 'CRITICAL');
  if (criticalGaps.length > 0) {
    risks.push({
      category: 'TEAM',
      severity: 'HIGH',
      title: `${criticalGaps.length} critical role${criticalGaps.length > 1 ? 's' : ''} unfilled`,
      description: `The following roles have no meaningful coverage: ${criticalGaps.map(g => g.role).join(', ')}.`,
      suggested_action: `Prioritize finding a contributor for: ${criticalGaps[0].role}.`
    });
  }

  if (!startup.business_model || startup.business_model.length === 0) {
    risks.push({
      category: 'BUSINESS',
      severity: 'MEDIUM',
      title: 'Business model not yet defined',
      description: 'No revenue or business model has been specified for this venture.',
      suggested_action: 'Define how this venture intends to generate revenue.'
    });
  }

  if ((startup.clarification_needed || []).length >= 2) {
    risks.push({
      category: 'MARKET',
      severity: 'MEDIUM',
      title: 'Positioning requires validation',
      description: `Several aspects of the venture remain unclear: ${startup.clarification_needed.slice(0, 2).join('; ')}.`,
      suggested_action: 'Clarify these points before pursuing contributors or investors.'
    });
  }

  const confidence = startup.confidence || {};
  if (confidence.problem === 'low' || confidence.solution === 'low') {
    risks.push({
      category: 'EXECUTION',
      severity: 'MEDIUM',
      title: 'Problem or solution not clearly articulated',
      description: 'The venture description did not provide enough detail to confidently identify the core problem or solution.',
      suggested_action: 'Expand the venture description with more specifics, then re-run analysis.'
    });
  }

  return risks;
}

function round2(n) { return Math.round(n * 100) / 100; }

async function runReadinessAndRiskAnalysis(startupId) {
  const startupResult = await pool.query('SELECT * FROM startups WHERE id = $1', [startupId]);
  if (startupResult.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const startup = startupResult.rows[0];

  const gapsResult = await pool.query('SELECT * FROM gaps WHERE startup_id = $1', [startupId]);
  const gaps = gapsResult.rows;

  const readiness = computeReadiness(startup, gaps);
  const risks = computeRisks(startup, gaps);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const readinessResult = await client.query(
      `INSERT INTO readiness_assessments (startup_id, overall_score, dimensions, critical_issues, top_actions)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [startupId, readiness.overall_score, JSON.stringify(readiness.dimensions), readiness.critical_issues, readiness.top_actions]
    );

    await client.query('DELETE FROM risks WHERE startup_id = $1', [startupId]);
    const insertedRisks = [];
    for (const r of risks) {
      const rr = await client.query(
        `INSERT INTO risks (startup_id, category, severity, title, description, suggested_action)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [startupId, r.category, r.severity, r.title, r.description, r.suggested_action]
      );
      insertedRisks.push(rr.rows[0]);
    }

    await client.query('COMMIT');
    return { success: true, readiness: readinessResult.rows[0], risks: insertedRisks };
  } catch (err) {
    await client.query('ROLLBACK');
    return { success: false, error: 'PERSISTENCE_FAILED', detail: err.message };
  } finally {
    client.release();
  }
}

async function getLatestReadiness(startupId) {
  const result = await pool.query(
    'SELECT * FROM readiness_assessments WHERE startup_id = $1 ORDER BY generated_at DESC LIMIT 1',
    [startupId]
  );
  if (result.rows.length === 0) return { success: false, error: 'NOT_YET_ANALYZED' };
  return { success: true, readiness: result.rows[0] };
}

async function getRisks(startupId) {
  const result = await pool.query('SELECT * FROM risks WHERE startup_id = $1 ORDER BY severity DESC, created_at DESC', [startupId]);
  return { success: true, risks: result.rows };
}

module.exports = { computeReadiness, computeRisks, runReadinessAndRiskAnalysis, getLatestReadiness, getRisks };
