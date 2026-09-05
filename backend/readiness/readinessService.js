/**
 * AI-09 — Readiness Engine + AI-08 — Risk Engine.
 * Ref: AI/Intelligence spec §24-31, TRD §27-29.
 *
 * Deterministic, explainable, weighted-dimension model (AI spec §26).
 * Readiness != inverse of Risk — computed independently per §28.
 */
const pool = require('../shared/db');

/**
 * Phase 1 rebuild: the exact 4 dimensions named in the project's own
 * PPT (Objective 1) — team composition, market positioning, product
 * readiness, funding readiness. The previous 7-dimension model
 * (team/problem/solution/market/execution/technical/business) never
 * matched what the project claims to measure, and funding readiness
 * had no dedicated signal at all until now.
 */
const READINESS_WEIGHTS = {
  team_composition: 0.30,
  market_positioning: 0.20,
  product_readiness: 0.25,
  funding_readiness: 0.25
};

const CONFIDENCE_TO_SCORE = { high: 0.9, medium: 0.6, low: 0.3 };
const STAGE_TO_EXECUTION_SCORE = { 'Idea': 0.3, 'Prototype': 0.5, 'MVP': 0.7, 'Early Traction': 0.9, 'Unclear': 0.2 };
const FUNDING_STAGE_SCORE = { 'Bootstrapped': 0.3, 'Pre-seed': 0.5, 'Seed': 0.7, 'Series A+': 0.9 };

/**
 * Pure function: computes readiness dimensions from structured startup
 * state + gap coverage. Testable in isolation (TRD §92).
 */
/**
 * Real, evidence-based written justification per dimension — required
 * by Objective 1's own completion criterion ("per-dimension score AND
 * a written justification"), which Phase 1's dimension rebuild fixed
 * the scores for but never added the justification text for. Built
 * directly from the same sub-factors that produced the score, never
 * a separate free-form claim.
 */
function buildJustifications(dimensions, factors) {
  return {
    team_composition: factors.gapsCount === 0
      ? 'No gaps have been diagnosed yet, so team coverage is unscored — run gap diagnosis first.'
      : `Based on ${factors.gapsCount} diagnosed role${factors.gapsCount !== 1 ? 's' : ''}, ${Math.round(dimensions.team_composition * 100)}% average coverage across required roles.`,
    market_positioning: `${factors.hasTargetUsers ? 'Target users are defined' : 'Target users are not yet defined'}; ${factors.hasDomain ? 'domain is specified' : 'domain is not yet specified'}; solution-fit confidence is ${factors.solutionConfidenceLevel}.`,
    product_readiness: `Venture is at "${factors.stage}" stage; solution-fit confidence is ${factors.solutionConfidenceLevel}; ${factors.hasTechRequirements ? `technical role coverage is ${Math.round(dimensions.product_readiness * 100)}%` : 'no technical requirements have been specified yet'}.`,
    funding_readiness: `${factors.hasBusinessModel ? 'Business model is defined' : 'Business model is not yet defined'}; funding stage is "${factors.fundingStage || 'not specified'}"; ${factors.dpiitRecognized ? 'DPIIT-recognized' : 'not yet DPIIT-recognized'}; ${factors.hasTimeline ? 'a target timeline is stated' : 'no target timeline stated'}.`
  };
}

function computeReadiness(startup, gaps) {
  const confidence = startup.confidence || {};

  // --- TEAM COMPOSITION: average coverage across all diagnosed role requirements. ---
  const teamCoverage = gaps.length > 0
    ? gaps.reduce((sum, g) => sum + parseFloat(g.coverage), 0) / gaps.length
    : 0.5; // no gaps diagnosed yet — neutral, not fabricated confidence

  // --- MARKET POSITIONING: target-user clarity + domain clarity + solution confidence. ---
  const hasTargetUsers = (startup.target_users || []).length > 0;
  const hasDomain = (startup.domain || []).length > 0;
  const solutionScore = CONFIDENCE_TO_SCORE[confidence.solution] ?? 0.5;
  const marketPositioning = (hasTargetUsers ? 0.4 : 0) + (hasDomain ? 0.3 : 0) + (solutionScore * 0.3);

  // --- PRODUCT READINESS: stage progress + solution confidence + technical role coverage. ---
  const executionScore = STAGE_TO_EXECUTION_SCORE[startup.stage] ?? 0.3;
  const hasTechRequirements = (startup.technology_requirements || []).length > 0;
  const technicalCoverage = hasTechRequirements ? teamCoverage : 0.6;
  const productReadiness = (executionScore * 0.4) + (solutionScore * 0.3) + (technicalCoverage * 0.3);

  // --- FUNDING READINESS (real dimension, previously did not exist): ---
  // business model defined + funding stage progress + Indian DPIIT
  // recognition (real localized signal — DPIIT status affects tax/
  // compliance benefits and investor perception in the Indian market,
  // per the project's own Gap 04) + a stated target timeline (shows
  // real planning, not just an idea).
  const hasBusinessModel = (startup.business_model || []).length > 0;
  const fundingStageScore = FUNDING_STAGE_SCORE[startup.funding_stage] ?? 0.3;
  const dpiitBonus = startup.dpiit_recognized ? 0.2 : 0;
  const hasTimeline = !!startup.target_timeline;
  const fundingReadiness = (hasBusinessModel ? 0.3 : 0) + (fundingStageScore * 0.3) + dpiitBonus + (hasTimeline ? 0.2 : 0);

  const dimensions = {
    team_composition: round2(teamCoverage),
    market_positioning: round2(Math.min(marketPositioning, 1)),
    product_readiness: round2(Math.min(productReadiness, 1)),
    funding_readiness: round2(Math.min(fundingReadiness, 1))
  };

  const overall = Object.keys(READINESS_WEIGHTS).reduce(
    (sum, dim) => sum + dimensions[dim] * READINESS_WEIGHTS[dim], 0
  );

  const criticalIssues = [];
  if (dimensions.team_composition < 0.4) criticalIssues.push('Team composition lacks coverage for one or more critical roles.');
  if (dimensions.funding_readiness < 0.4) criticalIssues.push('Funding readiness is low — business model and funding plan need clarity.');
  if (dimensions.market_positioning < 0.4) criticalIssues.push('Market positioning is unclear — target users or domain are not well-defined.');
  if (dimensions.product_readiness < 0.4) criticalIssues.push('Product readiness is early-stage relative to the venture\'s other dimensions.');

  const topActions = gaps
    .filter(g => g.priority_level === 'CRITICAL' || g.priority_level === 'HIGH')
    .slice(0, 3)
    .map(g => `Address the "${g.role}" gap (${g.priority_level.toLowerCase()} priority).`);

  const justifications = buildJustifications(dimensions, {
    gapsCount: gaps.length,
    hasTargetUsers, hasDomain,
    solutionConfidenceLevel: confidence.solution || 'unstated',
    stage: startup.stage || 'Unclear',
    hasTechRequirements,
    hasBusinessModel,
    fundingStage: startup.funding_stage,
    dpiitRecognized: !!startup.dpiit_recognized,
    hasTimeline
  });

  return {
    overall_score: Math.round(overall * 100),
    dimensions,
    dimension_justifications: justifications,
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

async function getReadinessHistory(startupId) {
  const result = await pool.query(
    'SELECT overall_score, dimensions, generated_at FROM readiness_assessments WHERE startup_id = $1 ORDER BY generated_at ASC',
    [startupId]
  );
  return { success: true, history: result.rows };
}

module.exports = { computeReadiness, computeRisks, runReadinessAndRiskAnalysis, getLatestReadiness, getRisks, getReadinessHistory };
