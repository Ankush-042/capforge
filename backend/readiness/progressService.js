/**
 * One question, answered properly: how is this venture doing, and why.
 *
 * Readiness, Risks, Milestones and Analytics were four screens answering
 * variations of the same question, and none of them connected to the others.
 * Readiness said "team composition 25%" and never told a founder WHICH open
 * roles caused that. Risks listed team problems without saying they were the
 * reason the score was low. Analytics drew a line with no explanation of what
 * moved it.
 *
 * A founder had to hold four screens in their head and join them manually.
 * That is the work the product should be doing.
 *
 * THE JOIN THAT MAKES THIS POSSIBLE
 * Risk categories (TEAM, MARKET, TECHNICAL, EXECUTION, BUSINESS) map onto
 * readiness dimensions (team_composition, market_positioning,
 * product_readiness, funding_readiness), and open gaps map onto team
 * composition directly. So every weak dimension can name its own causes from
 * data that already exists. Nothing here is a new score or a new judgement:
 * it is the existing signals, finally pointed at each other.
 */
const pool = require('../shared/db');

const INVESTOR_BAR = 35;

/**
 * Which risk categories genuinely explain which dimension.
 *
 * TECHNICAL and EXECUTION both land on product readiness, because a technical
 * problem and a delivery problem both show up as "the product is not there
 * yet". BUSINESS lands on funding, because business-model risk is what an
 * investor reads as funding risk.
 */
const DIMENSION_CAUSES = {
  team_composition: {
    label: 'Team',
    riskCategories: ['TEAM'],
    usesGaps: true,
    fixPath: '/app/gaps',
    fixLabel: 'Find the people',
  },
  market_positioning: {
    label: 'Market',
    riskCategories: ['MARKET'],
    usesGaps: false,
    fixPath: '/app/competitors',
    fixLabel: 'Work out your position',
  },
  product_readiness: {
    label: 'Product',
    riskCategories: ['TECHNICAL', 'EXECUTION'],
    usesGaps: false,
    usesMilestones: true,
    fixPath: '/app/milestones',
    fixLabel: 'Ship the next thing',
  },
  funding_readiness: {
    label: 'Funding',
    riskCategories: ['BUSINESS'],
    usesGaps: false,
    fixPath: '/app/pitch',
    fixLabel: 'Write your ask',
  },
};

async function getProgress(startupId, userId) {
  const startupRes = await pool.query(`SELECT * FROM startups WHERE id = $1`, [startupId]);
  if (startupRes.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const startup = startupRes.rows[0];

  // Same ownership rule as everywhere else, co-founder fix included.
  let isOwner = startup.founder_id === userId;
  if (!isOwner) {
    const co = await pool.query(
      `SELECT 1 FROM startup_team_members WHERE startup_id = $1 AND user_id = $2 AND is_founder = true`,
      [startupId, userId]
    );
    isOwner = co.rows.length > 0;
  }
  if (!isOwner) return { success: false, error: 'NOT_AUTHORIZED' };

  const [readinessRes, historyRes, risksRes, gapsRes, milestonesRes, teamRes] = await Promise.all([
    pool.query(
      `SELECT overall_score, dimensions, critical_issues, top_actions, generated_at
       FROM readiness_assessments WHERE startup_id = $1 ORDER BY generated_at DESC LIMIT 1`,
      [startupId]
    ),
    pool.query(
      `SELECT overall_score, generated_at FROM readiness_assessments
       WHERE startup_id = $1 ORDER BY generated_at ASC`,
      [startupId]
    ),
    pool.query(
      `SELECT id, title, description, severity, category, suggested_action
       FROM risks WHERE startup_id = $1`,
      [startupId]
    ),
    pool.query(
      `SELECT id, role, priority_level, seeking_type, coverage, status
       FROM gaps WHERE startup_id = $1 AND status NOT IN ('FILLED','DISMISSED')`,
      [startupId]
    ),
    pool.query(
      `SELECT id, title, description, status, sequence_order
       FROM milestones WHERE startup_id = $1 ORDER BY sequence_order ASC`,
      [startupId]
    ),
    pool.query(`SELECT COUNT(*) AS n FROM startup_team_members WHERE startup_id = $1`, [startupId]),
  ]);

  const readiness = readinessRes.rows[0] || null;
  const score = readiness ? Math.round(parseFloat(readiness.overall_score)) : null;
  const history = historyRes.rows.map((h) => ({
    score: Math.round(parseFloat(h.overall_score)),
    at: h.generated_at,
  }));

  const risks = risksRes.rows;
  const openGaps = gapsRes.rows.filter((g) => (parseFloat(g.coverage) || 0) === 0);
  const milestones = milestonesRes.rows;
  const nextMilestone = milestones.find((m) => m.status !== 'COMPLETED') || null;

  // Every dimension, with the real things causing its score.
  const dimensions = [];
  if (readiness?.dimensions) {
    for (const [key, value] of Object.entries(readiness.dimensions)) {
      if (typeof value !== 'number') continue;
      const meta = DIMENSION_CAUSES[key];
      if (!meta) continue;

      const causes = {
        risks: risks.filter((r) => meta.riskCategories.includes(r.category)),
        gaps: meta.usesGaps ? openGaps : [],
        milestone: meta.usesMilestones ? nextMilestone : null,
      };

      dimensions.push({
        key,
        label: meta.label,
        score: Math.round(value * 100),
        fixPath: meta.fixPath,
        fixLabel: meta.fixLabel,
        causes,
        // How many concrete, nameable things are holding this dimension down.
        // A dimension scoring low with nothing attached means the assessment
        // found a weakness it cannot point at, which is itself worth showing.
        causeCount: causes.risks.length + causes.gaps.length + (causes.milestone ? 1 : 0),
      });
    }
  }
  dimensions.sort((a, b) => a.score - b.score);

  const weakest = dimensions[0] || null;
  const first = history.length > 1 ? history[0].score : null;

  return {
    success: true,
    progress: {
      name: startup.name,
      score,
      investorBar: INVESTOR_BAR,
      visibleToInvestors: score !== null && score >= INVESTOR_BAR,
      pointsFromVisibility: score !== null ? Math.max(0, INVESTOR_BAR - score) : null,
      startedAt: first,
      delta: first !== null && score !== null ? score - first : null,
      assessmentCount: history.length,
      history,
      dimensions,
      weakest,
      criticalIssues: readiness?.critical_issues || [],
      teamSize: parseInt(teamRes.rows[0].n) || 0,
      openGapCount: openGaps.length,
      criticalGapCount: openGaps.filter((g) => g.priority_level === 'CRITICAL').length,
      criticalRiskCount: risks.filter((r) => r.severity === 'CRITICAL').length,
      nextMilestone,
      milestonesDone: milestones.filter((m) => m.status === 'COMPLETED').length,
      milestonesTotal: milestones.length,
      lastAssessedAt: readiness?.generated_at || null,
    },
  };
}

module.exports = { getProgress };
