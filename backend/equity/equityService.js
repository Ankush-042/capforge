/**
 * AI-15 — Equity Calculation Engine. Ref: AI spec §47-48, TRD §47, SRS §54-56.
 * Deliberately RULE-BASED, not AI-generated (SRS §56: never legal advice).
 */
const pool = require('../shared/db');

const STAGE_MULTIPLIER = { 'Idea': 1.3, 'Prototype': 1.15, 'MVP': 1.0, 'Early Traction': 0.8, 'Unclear': 1.1 };
const COMMITMENT_MULTIPLIER = { 'full-time': 1.0, 'part-time': 0.5, 'advisor': 0.15 };
const CRITICALITY_BASE = { CRITICAL: 8, HIGH: 5, MEDIUM: 3, LOW: 1.5 };

function calculateFounderSplit({ role, stage, commitment, priorityLevel, cashCompensation }) {
  const base = CRITICALITY_BASE[priorityLevel] || 3;
  const stageMult = STAGE_MULTIPLIER[stage] || 1.0;
  const commitMult = COMMITMENT_MULTIPLIER[commitment] || 0.5;
  const cashAdjustment = cashCompensation ? 0.7 : 1.0; // taking a salary reduces the equity ask

  const midpoint = base * stageMult * commitMult * cashAdjustment;
  const low = Math.max(Math.round((midpoint * 0.7) * 10) / 10, 0.5);
  const high = Math.round((midpoint * 1.3) * 10) / 10;

  return {
    range: { low, high },
    factors: { role, stage, commitment, priorityLevel, cashCompensation: !!cashCompensation },
    assumptions: [
      'Estimate reflects role criticality, venture stage, and time commitment only.',
      'Does not account for prior relationship, unique domain expertise, or negotiation leverage.',
      'This is guidance for discussion, not legal or financial advice.'
    ]
  };
}

function calculateContributorAsk({ role, stage, commitment, experienceYears, priorityLevel }) {
  const base = calculateFounderSplit({ role, stage, commitment, priorityLevel, cashCompensation: false });
  const experienceBoost = 1 + Math.min((experienceYears || 0) * 0.03, 0.3);
  return {
    range: {
      low: Math.round(base.range.low * experienceBoost * 10) / 10,
      high: Math.round(base.range.high * experienceBoost * 10) / 10
    },
    factors: { ...base.factors, experienceYears: experienceYears || 0 },
    assumptions: [...base.assumptions, 'A reasonable ask, not a guaranteed market rate.']
  };
}

async function runEquityCalculation(userId, { calculationType, startupId, inputs }) {
  let result;
  if (calculationType === 'FOUNDER_SPLIT') {
    result = calculateFounderSplit(inputs);
  } else if (calculationType === 'CONTRIBUTOR_ASK') {
    result = calculateContributorAsk(inputs);
  } else {
    return { success: false, error: 'INVALID_CALCULATION_TYPE' };
  }

  const row = await pool.query(
    `INSERT INTO equity_calculations (user_id, startup_id, calculation_type, inputs, result) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, startupId || null, calculationType, JSON.stringify(inputs), JSON.stringify(result)]
  );
  return { success: true, calculation: row.rows[0] };
}

module.exports = { calculateFounderSplit, calculateContributorAsk, runEquityCalculation };
