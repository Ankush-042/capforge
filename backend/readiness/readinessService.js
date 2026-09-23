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
/**
 * WEIGHTS, AND WHERE THEY COME FROM.
 *
 * The previous set (30/20/25/25) was chosen by judgement with nothing behind
 * it. If somebody asked why team was 30%, there was no answer.
 *
 * CB Insights analysed 431 VC-backed companies that shut down since 2023. The
 * root causes, as distinct from "ran out of capital" at 70% which is almost
 * always the final symptom rather than the reason:
 *
 *     poor product-market fit   43%
 *     bad timing                29%
 *     team problems             23%
 *     unsustainable economics   19%
 *
 * The 43% figure has held across three separate runs of this analysis: 101
 * companies in 2014, 353 in a 2020 academic replication, and 3,000 outcomes
 * now. It is one of the most stable findings in startup research.
 *
 * WE CAN ONLY MEASURE TWO OF THOSE FOUR. Team problems map to team coverage,
 * and unsustainable economics to funding readiness. Product-market fit and
 * timing, the two largest causes by some distance, require evidence this
 * platform does not hold about an idea-stage venture: real users, real usage,
 * real revenue. Inventing a proxy for them would be worse than admitting the
 * gap, so the gap is stated to the founder instead.
 *
 * So the two measurable causes share 70% of the score in the 23:19 ratio CB
 * Insights observed. The remaining 30% goes to two descriptive dimensions
 * that are not failure causes at all: how far the product has actually got,
 * and how clearly the idea is defined. Those two splits are our judgement and
 * are labelled as such wherever the score is explained.
 *
 * Source: https://www.cbinsights.com/research/report/startup-failure-reasons-top/
 */
const READINESS_WEIGHTS = {
  team_composition: 0.38,   // 70% x 23/42, from the observed failure frequency
  funding_readiness: 0.32,  // 70% x 19/42, from the observed failure frequency
  product_readiness: 0.20,  // our judgement: descriptive, not a failure cause
  idea_clarity: 0.10        // our judgement: descriptive, not a failure cause
};

/** Shown with the score so the weighting can be checked rather than trusted. */
const WEIGHT_BASIS = {
  team_composition: { sourced: true, note: 'Team problems appear in 23% of startup post-mortems (CB Insights, 431 companies). Team and funding share 70% of the score in the 23:19 ratio observed.' },
  funding_readiness: { sourced: true, note: 'Unsustainable unit economics appear in 19% of post-mortems (CB Insights).' },
  product_readiness: { sourced: false, note: 'Our judgement. How far the product has got is descriptive rather than a measured failure cause.' },
  idea_clarity: { sourced: false, note: 'Our judgement. Weighted lowest deliberately: a clearly described idea is not the same as a good one.' },
};

/**
 * Stated openly rather than hidden, because it is the most important thing
 * about this score: the two biggest reasons startups fail are the two this
 * score does not measure.
 */
const UNMEASURED = 'The two largest causes of startup failure, product-market fit at 43% and timing at 29% (CB Insights), are not measured here. Doing so would need evidence of real users and real demand that an idea-stage venture does not have yet. A high score means a venture is well set up, not that anybody wants it.';

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
      ? 'No roles have been diagnosed yet, so team coverage cannot be measured. Its weight is shared across the other dimensions rather than counted as a half mark.'
      : `Based on ${factors.gapsCount} diagnosed role${factors.gapsCount !== 1 ? 's' : ''}, ${Math.round(dimensions.team_composition * 100)}% average coverage across required roles.`,
    idea_clarity: `Problem clarity is ${factors.problemConfidenceLevel}; solution clarity is ${factors.solutionConfidenceLevel}; ${factors.hasTargetUsers && factors.hasDomain ? 'target users and a domain are both identified' : factors.hasTargetUsers || factors.hasDomain ? 'only one of target users or domain is identified' : 'neither target users nor a domain are identified'}.`,
    product_readiness: `Venture is at "${factors.stage}" stage; solution-fit confidence is ${factors.solutionConfidenceLevel}; ${factors.hasTechRequirements ? `technical role coverage is ${Math.round(dimensions.product_readiness * 100)}%` : 'no technical requirements have been specified yet'}.`,
    funding_readiness: `${factors.hasBusinessModel ? 'Business model is defined' : 'Business model is not yet defined'}; funding stage is "${factors.fundingStage || 'not specified'}"; ${factors.dpiitRecognized ? 'DPIIT-recognized' : 'not yet DPIIT-recognized'}; ${factors.hasTimeline ? 'a target timeline is stated' : 'no target timeline stated'}.`
  };
}

function computeReadiness(startup, gaps) {
  const confidence = startup.confidence || {};

  // --- TEAM COMPOSITION: average coverage across all diagnosed role requirements. ---
  // UNMEASURED, not 0.5. With no roles diagnosed there is nothing to compute
  // coverage against, and 0.5 was a fabricated half-mark worth 15 points of
  // the old score for a venture that had done nothing. An unmeasured dimension
  // is excluded from the weighted sum and the remaining weights are
  // renormalised, so the score reflects only what is actually known.
  const teamCoverage = gaps.length > 0
    ? gaps.reduce((sum, g) => sum + parseFloat(g.coverage), 0) / gaps.length
    : null;

  // --- IDEA CLARITY: how clearly the venture is described. ---
  //
  // RENAMED, AND REBUILT. This was called "market positioning" and claimed to
  // measure market fit. It did not. It awarded 0.4 for target users being
  // defined and 0.3 for a domain being specified, and BOTH of those fields are
  // filled automatically by the AI structuring step for every venture that
  // exists. Seven tenths of the dimension was handed out for the product
  // having run, not for anything the founder did or knew, and the label said
  // "market" while the arithmetic said "did structuring finish".
  //
  // What it actually measures is how clearly the idea came across, so that is
  // what it is called now, and the confidence the structuring step reported is
  // the honest signal for it: a clearly written idea parses confidently, a
  // vague one does not. Having target users and a domain still counts, but at
  // 0.2 rather than 0.7, because it is close to automatic.
  const hasTargetUsers = (startup.target_users || []).length > 0;
  const hasDomain = (startup.domain || []).length > 0;
  const solutionScore = CONFIDENCE_TO_SCORE[confidence.solution] ?? 0.5;
  const problemScore = CONFIDENCE_TO_SCORE[confidence.problem] ?? solutionScore;
  const ideaClarity = (problemScore * 0.4) + (solutionScore * 0.4)
    + ((hasTargetUsers && hasDomain) ? 0.2 : (hasTargetUsers || hasDomain) ? 0.1 : 0);

  // --- PRODUCT READINESS: stage progress + solution confidence + technical role coverage. ---
  const executionScore = STAGE_TO_EXECUTION_SCORE[startup.stage] ?? 0.3;
  const hasTechRequirements = (startup.technology_requirements || []).length > 0;
  const technicalCoverage = hasTechRequirements ? (teamCoverage ?? 0.5) : 0.6;
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
    team_composition: teamCoverage === null ? null : round2(teamCoverage),
    idea_clarity: round2(Math.min(ideaClarity, 1)),
    product_readiness: round2(Math.min(productReadiness, 1)),
    funding_readiness: round2(Math.min(fundingReadiness, 1))
  };

  // Renormalise over what is actually measured. If team coverage is unknown,
  // its weight is redistributed rather than silently counted as a half mark.
  const measured = Object.keys(READINESS_WEIGHTS).filter((d) => dimensions[d] !== null);
  const totalWeight = measured.reduce((sum, d) => sum + READINESS_WEIGHTS[d], 0);
  const overall = totalWeight > 0
    ? measured.reduce((sum, d) => sum + dimensions[d] * (READINESS_WEIGHTS[d] / totalWeight), 0)
    : 0;

  const criticalIssues = [];
  // The 0.4 threshold is our judgement, not a measured cliff edge.
  if (dimensions.team_composition !== null && dimensions.team_composition < 0.4) criticalIssues.push('Team composition lacks coverage for one or more critical roles.');
  if (dimensions.funding_readiness < 0.4) criticalIssues.push('Funding readiness is low — business model and funding plan need clarity.');
  if (dimensions.idea_clarity < 0.4) criticalIssues.push('The idea is not yet described clearly enough for the problem and solution to be understood.');
  if (dimensions.product_readiness < 0.4) criticalIssues.push('Product readiness is early-stage relative to the venture\'s other dimensions.');

  const topActions = gaps
    .filter(g => g.priority_level === 'CRITICAL' || g.priority_level === 'HIGH')
    .slice(0, 3)
    .map(g => `Address the "${g.role}" gap (${g.priority_level.toLowerCase()} priority).`);

  const justifications = buildJustifications(dimensions, {
    gapsCount: gaps.length,
    hasTargetUsers, hasDomain,
    solutionConfidenceLevel: confidence.solution || 'unstated',
    problemConfidenceLevel: confidence.problem || 'unstated',
    stage: startup.stage || 'Unclear',
    hasTechRequirements,
    hasBusinessModel,
    fundingStage: startup.funding_stage,
    dpiitRecognized: !!startup.dpiit_recognized,
    hasTimeline
  });

  /**
   * THE ARITHMETIC, kept rather than discarded.
   *
   * The justifications above were computed and thrown away on every run: the
   * insert saved only the four numbers. A founder could see a score and
   * nothing about how it was reached. This is stored now, so "why is my score
   * 42?" has an answer made of the same sub-factors that produced it.
   */
  const breakdown = {
    weights: READINESS_WEIGHTS,
    weight_basis: WEIGHT_BASIS,
    unmeasured_note: UNMEASURED,
    dimensions: {
      team_composition: {
        label: 'Team',
        score: dimensions.team_composition,
        weight: READINESS_WEIGHTS.team_composition,
        contribution: dimensions.team_composition === null ? null
          : round2(dimensions.team_composition * (READINESS_WEIGHTS.team_composition / totalWeight) * 100),
        parts: gaps.length === 0
          ? [{ step: 'No roles diagnosed yet', value: 'unmeasured', sourced: true }]
          : [{ step: `Average coverage across ${gaps.length} diagnosed role${gaps.length === 1 ? '' : 's'}`, value: `${Math.round((teamCoverage ?? 0) * 100)}%`, sourced: true }],
      },
      funding_readiness: {
        label: 'Funding',
        score: dimensions.funding_readiness,
        weight: READINESS_WEIGHTS.funding_readiness,
        contribution: round2(dimensions.funding_readiness * (READINESS_WEIGHTS.funding_readiness / totalWeight) * 100),
        parts: [
          { step: 'Business model defined', value: hasBusinessModel ? '+0.30' : '0', sourced: false },
          { step: `Funding stage: ${startup.funding_stage || 'not specified'}`, value: `+${round2(fundingStageScore * 0.3)}`, sourced: false },
          { step: 'DPIIT recognition', value: startup.dpiit_recognized ? '+0.20' : '0', sourced: true },
          { step: 'Target timeline stated', value: hasTimeline ? '+0.20' : '0', sourced: false },
        ],
      },
      product_readiness: {
        label: 'Product',
        score: dimensions.product_readiness,
        weight: READINESS_WEIGHTS.product_readiness,
        contribution: round2(dimensions.product_readiness * (READINESS_WEIGHTS.product_readiness / totalWeight) * 100),
        parts: [
          { step: `Stage: ${startup.stage || 'unclear'}`, value: `${round2(executionScore * 0.4)}`, sourced: false },
          { step: `Solution clarity: ${confidence.solution || 'unstated'}`, value: `${round2(solutionScore * 0.3)}`, sourced: false },
          { step: 'Technical role coverage', value: `${round2(technicalCoverage * 0.3)}`, sourced: true },
        ],
      },
      idea_clarity: {
        label: 'Clarity',
        score: dimensions.idea_clarity,
        weight: READINESS_WEIGHTS.idea_clarity,
        contribution: round2(dimensions.idea_clarity * (READINESS_WEIGHTS.idea_clarity / totalWeight) * 100),
        parts: [
          { step: `Problem clarity: ${confidence.problem || 'unstated'}`, value: `${round2(problemScore * 0.4)}`, sourced: false },
          { step: `Solution clarity: ${confidence.solution || 'unstated'}`, value: `${round2(solutionScore * 0.4)}`, sourced: false },
          { step: 'Target users and domain identified', value: `${(hasTargetUsers && hasDomain) ? '0.2' : (hasTargetUsers || hasDomain) ? '0.1' : '0'}`, sourced: false },
        ],
      },
    },
    sources: [
      { label: 'CB Insights — the top reasons startups fail, 431 companies', url: 'https://www.cbinsights.com/research/report/startup-failure-reasons-top/' },
    ],
  };

  return {
    overall_score: Math.round(overall * 100),
    dimensions,
    dimension_justifications: justifications,
    critical_issues: criticalIssues,
    top_actions: topActions,
    breakdown
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
      `INSERT INTO readiness_assessments (startup_id, overall_score, dimensions, critical_issues, top_actions, breakdown)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [startupId, readiness.overall_score, JSON.stringify(readiness.dimensions), readiness.critical_issues, readiness.top_actions, JSON.stringify(readiness.breakdown)]
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
