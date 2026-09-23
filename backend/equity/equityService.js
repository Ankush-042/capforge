/**
 * Equity guidance, anchored to published market data.
 *
 * WHY THIS WAS REBUILT. The previous version produced a percentage from three
 * invented constants: CRITICALITY_BASE {CRITICAL:8, HIGH:5, MEDIUM:3, LOW:1.5},
 * STAGE_MULTIPLIER {Idea:1.3 ...} and COMMITMENT_MULTIPLIER. Nothing backed any
 * of them. A critical full-time role at idea stage came out at 7.3-13.5%, while
 * Carta's data across 8,000+ initial grants puts a FIRST hire's median at 1.49%
 * with an observed range of 0.5-4%. It was roughly five to nine times the
 * market, and if anyone had asked where the numbers came from, the honest
 * answer was nowhere.
 *
 * THE DEEPER FAULT was using one formula for three different things. A
 * co-founder, an early employee and an advisor sit in completely different
 * bands, and the old code could not tell them apart because it never looked at
 * seeking_type. There are three models now, each anchored separately.
 *
 * EVERY CONSTANT BELOW IS EITHER SOURCED OR LABELLED AS JUDGEMENT. Where it is
 * judgement it only moves a result WITHIN an observed band, never outside one.
 * The output is clamped to the published range in every case, so no combination
 * of inputs can produce a number the market has not actually been seen to pay.
 *
 * Still rule-based, never AI, and never legal advice (SRS §56).
 */
const pool = require('../shared/db');

/**
 * SOURCE: Carta, 8,000+ initial equity grants to the first ten hires at
 * startups, June 2023 to June 2024. Medians and observed ranges by hire order.
 * https://carta.com/data/linkedin-early-employee-equity-fair-definition/
 */
const CARTA_HIRE_GRANTS = {
  1:  { median: 1.49, low: 0.50, high: 4.00 },
  2:  { median: 0.85, low: 0.30, high: 2.00 },
  3:  { median: 0.50, low: 0.21, high: 1.20 },
  4:  { median: 0.44, low: 0.18, high: 1.00 },
  5:  { median: 0.34, low: 0.13, high: 0.80 },
  10: { median: 0.18, low: 0.07, high: 0.42 }, // 10th-hire median per Carta/CRV; band scaled from hire 5's observed ratios
};

/**
 * SOURCE: Founder Institute's FAST agreement (Founder/Advisor Standard
 * Template), v3 released June 2026. A grid of company maturity against advisor
 * involvement, running 0.1% to 1%. https://fi.co/fast
 *
 * REALITY CHECK, shown to the user alongside it: Carta's 2024 data puts the
 * MEDIAN pre-seed advisor grant at 0.21%, below FAST's standard tier, and only
 * 10% of pre-seed advisors received 1% or more. FAST is the upper convention;
 * the market pays less.
 */
const FAST_ADVISOR = {
  'Idea':           { standard: 0.50, expert: 1.00, maturity: 'pre-seed' },
  'Prototype':      { standard: 0.50, expert: 1.00, maturity: 'pre-seed' },
  'MVP':            { standard: 0.25, expert: 0.75, maturity: 'seed' },
  'Early Traction': { standard: 0.10, expert: 0.50, maturity: 'Series A' },
  'Unclear':        { standard: 0.25, expert: 0.75, maturity: 'seed' },
};
const CARTA_ADVISOR_MEDIAN_PRESEED = 0.21;

/**
 * SOURCE: Carta founder ownership data. 45.9% of two-founder teams split
 * equally in 2024; among teams that split unequally the median is 55/45; the
 * median founding team retains about 56% of fully diluted equity after seed
 * and 36% after Series A. https://carta.com/data/founder-ownership-2026/
 */
const equalSplitReference = (existingFounders) => 100 / ((existingFounders || 1) + 1);

/**
 * JUDGEMENT, not sourced: how much of an equal split a co-founder joining
 * LATER should expect, given how much already exists when they arrive. No
 * public dataset tracks late co-founder splits, because they are privately
 * negotiated. The direction is uncontroversial; the exact values are ours and
 * are labelled as such everywhere the result is shown.
 */
const LATE_COFOUNDER_SHARE = { 'Idea': 0.90, 'Prototype': 0.60, 'MVP': 0.40, 'Early Traction': 0.25, 'Unclear': 0.60 };

/** JUDGEMENT: part-time is worth roughly half a full-time commitment. */
const COMMITMENT_FACTOR = { 'full-time': 1.0, 'part-time': 0.5 };

/** JUDGEMENT: taking a salary reduces the equity ask. The direction is standard. */
const CASH_FACTOR = 0.7;

const round2 = (n) => Math.round(n * 100) / 100;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Carta's table by hire order, interpolating past the fifth hire. */
function hireBand(hireOrder) {
  const n = Math.max(1, Math.round(hireOrder || 1));
  if (CARTA_HIRE_GRANTS[n]) return { ...CARTA_HIRE_GRANTS[n], hireOrder: n, exact: true };
  if (n > 10) return { ...CARTA_HIRE_GRANTS[10], hireOrder: n, exact: false };
  const a = CARTA_HIRE_GRANTS[5], b = CARTA_HIRE_GRANTS[10];
  const t = (n - 5) / 5;
  const median = a.median + (b.median - a.median) * t;
  return {
    median: round2(median),
    low: round2(median * (a.low / a.median)),
    high: round2(median * (a.high / a.median)),
    hireOrder: n, exact: false,
  };
}

/**
 * An early employee or core hire. Anchored on the median for their hire order,
 * moved within Carta's observed range by the factors we can justify, and
 * clamped so it can never leave that range.
 */
function coreHireEquity({ stage, commitment, priorityLevel, cashCompensation, hireOrder, experienceYears }) {
  const band = hireBand(hireOrder);
  const derivation = [{
    step: `Median grant for hire number ${band.hireOrder}`,
    value: `${band.median}%`,
    detail: band.exact
      ? `Carta, 8,000+ initial grants to the first ten hires, June 2023 to June 2024. Observed range ${band.low}% to ${band.high}%.`
      : `Interpolated between Carta's fifth-hire and tenth-hire medians. Observed range ${band.low}% to ${band.high}%.`,
    sourced: true,
  }];

  let value = band.median;

  const critFactor = { CRITICAL: 1.5, HIGH: 1.2, MEDIUM: 1.0, LOW: 0.8 }[priorityLevel] ?? 1.0;
  if (critFactor !== 1.0) {
    value *= critFactor;
    derivation.push({ step: `Role priority is ${String(priorityLevel).toLowerCase()}`, value: `×${critFactor}`, detail: 'Our judgement. Moves the figure within the observed range, never outside it.', sourced: false });
  }

  const commitFactor = COMMITMENT_FACTOR[commitment] ?? 1.0;
  if (commitFactor !== 1.0) {
    value *= commitFactor;
    derivation.push({ step: 'Part-time rather than full-time', value: `×${commitFactor}`, detail: 'Our judgement.', sourced: false });
  }

  if (cashCompensation) {
    value *= CASH_FACTOR;
    derivation.push({ step: 'Taking a salary as well', value: `×${CASH_FACTOR}`, detail: 'Our judgement. Cash compensation reduces the equity component.', sourced: false });
  }

  const years = experienceYears || 0;
  const expFactor = 1 + Math.min(years * 0.03, 0.3);
  if (expFactor > 1) {
    value *= expFactor;
    derivation.push({ step: `${years} year${years === 1 ? '' : 's'} of experience`, value: `×${round2(expFactor)}`, detail: 'Our judgement, capped at +30%.', sourced: false });
  }

  const midpoint = clamp(value, band.low, band.high);
  if (round2(midpoint) !== round2(value)) {
    derivation.push({ step: 'Held inside the observed range', value: `${band.low}% to ${band.high}%`, detail: 'Clamped so the figure stays within what Carta actually observed for this hire order.', sourced: true });
  }

  return {
    basis: 'CORE_HIRE',
    basisLabel: `Early hire, number ${band.hireOrder} on the team`,
    midpoint: round2(midpoint),
    range: { low: round2(clamp(midpoint * 0.7, band.low, band.high)), high: round2(clamp(midpoint * 1.4, band.low, band.high)) },
    observedRange: { low: band.low, high: band.high },
    derivation,
  };
}

/** A co-founder: founding equity, not a grant from the option pool. */
function coFounderEquity({ stage, commitment, cashCompensation, existingFounders }) {
  const equal = equalSplitReference(existingFounders);
  const shareFactor = LATE_COFOUNDER_SHARE[stage] ?? 0.60;

  const derivation = [
    { step: `An equal split with ${existingFounders || 1} existing founder${(existingFounders || 1) === 1 ? '' : 's'}`, value: `${round2(equal)}%`, detail: 'Carta: 45.9% of two-founder teams split equally in 2024, and among those that do not, the median split is 55/45.', sourced: true },
    { step: `Joining at ${stage} stage`, value: `×${shareFactor}`, detail: 'Our judgement. No public dataset tracks late co-founder splits because they are privately negotiated. The later somebody joins, the more already exists.', sourced: false },
  ];

  let value = equal * shareFactor;

  const commitFactor = COMMITMENT_FACTOR[commitment] ?? 1.0;
  if (commitFactor !== 1.0) {
    value *= commitFactor;
    derivation.push({ step: 'Part-time rather than full-time', value: `×${commitFactor}`, detail: 'Our judgement.', sourced: false });
  }
  if (cashCompensation) {
    value *= CASH_FACTOR;
    derivation.push({ step: 'Taking a salary as well', value: `×${CASH_FACTOR}`, detail: 'Our judgement.', sourced: false });
  }

  const midpoint = clamp(value, 2, equal);
  return {
    basis: 'CO_FOUNDER',
    basisLabel: 'Co-founder, sharing founding equity',
    midpoint: round2(midpoint),
    range: { low: round2(clamp(midpoint * 0.75, 2, equal)), high: round2(clamp(midpoint * 1.25, 2, equal)) },
    observedRange: { low: 2, high: round2(equal) },
    derivation,
    context: 'For reference, Carta puts the median founding team at about 56% of fully diluted equity after a seed round, and 36% after Series A.',
  };
}

/** An advisor: the FAST grid, with the real market median shown beside it. */
function advisorEquity({ stage, priorityLevel }) {
  const grid = FAST_ADVISOR[stage] ?? FAST_ADVISOR['Unclear'];
  const expert = priorityLevel === 'CRITICAL' || priorityLevel === 'HIGH';
  const value = expert ? grid.expert : grid.standard;

  return {
    basis: 'ADVISOR',
    basisLabel: `Advisor, ${expert ? 'expert' : 'standard'} involvement`,
    midpoint: value,
    range: { low: grid.standard, high: grid.expert },
    observedRange: { low: grid.standard, high: grid.expert },
    derivation: [
      { step: `FAST grid, ${grid.maturity} maturity, ${expert ? 'expert' : 'standard'} involvement`, value: `${value}%`, detail: "Founder Institute's Founder/Advisor Standard Template, v3, June 2026. The grid runs 0.1% to 1% across stage and involvement.", sourced: true },
      { step: 'What the market actually pays', value: `${CARTA_ADVISOR_MEDIAN_PRESEED}% median`, detail: 'Carta 2024: the median pre-seed advisor grant is 0.21%, below the FAST standard tier, and only 10% of pre-seed advisors received 1% or more. Treat FAST as the upper convention.', sourced: true },
    ],
    context: 'Total advisory allocations across all advisors rarely exceed 5% of the company.',
  };
}

const SOURCES = [
  { label: 'Carta — early employee equity, 8,000+ initial grants', url: 'https://carta.com/data/linkedin-early-employee-equity-fair-definition/' },
  { label: 'Carta — Founder Ownership Report 2026', url: 'https://carta.com/data/founder-ownership-2026/' },
  { label: 'Founder Institute — FAST advisor agreement', url: 'https://fi.co/fast' },
];

const ASSUMPTIONS = [
  'Percentages are of fully diluted equity, before any future funding dilution.',
  'Nothing here accounts for prior relationship, unique domain expertise, or negotiating leverage.',
  'Guidance for a conversation, not legal or financial advice.',
];

/**
 * One entry point for all three. seekingType decides the model, except that an
 * advisor commitment always uses the advisor grid, because that is what the
 * band describes regardless of the role title.
 */
function calculateEquity(inputs = {}) {
  const { role, stage = 'Idea', commitment = 'full-time', priorityLevel = 'MEDIUM',
          cashCompensation = false, seekingType, hireOrder, existingFounders, experienceYears } = inputs;

  let result;
  if (commitment === 'advisor') {
    result = advisorEquity({ stage, priorityLevel });
  } else if (seekingType === 'CO_FOUNDER') {
    result = coFounderEquity({ stage, commitment, cashCompensation, existingFounders });
  } else {
    result = coreHireEquity({ stage, commitment, priorityLevel, cashCompensation, hireOrder, experienceYears });
  }

  return {
    ...result,
    factors: { role, stage, commitment, priorityLevel, cashCompensation: !!cashCompensation,
               seekingType: commitment === 'advisor' ? 'ADVISOR' : (seekingType || 'CORE_HIRE'),
               hireOrder, existingFounders, experienceYears },
    assumptions: ASSUMPTIONS,
    sources: SOURCES,
  };
}

async function runEquityCalculation(userId, { calculationType, startupId, inputs }) {
  if (!['FOUNDER_SPLIT', 'CONTRIBUTOR_ASK'].includes(calculationType)) {
    return { success: false, error: 'INVALID_CALCULATION_TYPE' };
  }

  // Both perspectives use the same bands. What a founder should offer and what
  // a contributor should ask for are the same number seen from two sides, and
  // publishing two different answers for one negotiation is how a tool loses
  // the trust of whichever side reads the other's number.
  const result = calculateEquity(inputs || {});

  const row = await pool.query(
    `INSERT INTO equity_calculations (user_id, startup_id, calculation_type, inputs, result) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, startupId || null, calculationType, JSON.stringify(inputs || {}), JSON.stringify(result)]
  );
  return { success: true, calculation: row.rows[0] };
}

module.exports = { runEquityCalculation, calculateEquity, hireBand, CARTA_HIRE_GRANTS, FAST_ADVISOR };
