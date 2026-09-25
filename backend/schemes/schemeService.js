/**
 * Which government schemes a venture actually qualifies for.
 *
 * Deterministic. No model involved anywhere: every answer is a published
 * criterion checked against a stored fact, and every one traces back to a URL
 * and a verification date. That is the only way a feature like this is worth
 * having, because a founder will act on what it says.
 *
 * It never returns "eligible". It returns which published criteria are
 * satisfied, which are not, and which a person has to judge.
 */
const pool = require('../shared/db');
const { SCHEMES, VERIFIED_ON } = require('./schemeCatalogue');

async function getVenture(startupId) {
  const r = await pool.query(
    `SELECT id, name, domain, stage, dpiit_recognized, entity_type,
            incorporation_date, prior_govt_funding_lakhs, founder_id
     FROM startups WHERE id = $1`,
    [startupId]
  );
  return r.rows[0] || null;
}

/** One scheme against one venture. */
function evaluate(scheme, venture) {
  const results = scheme.criteria.map((c) => {
    const outcome = c.check(venture);
    return { label: c.label, note: c.note || null, ...outcome };
  });

  const notMet = results.filter((r) => r.state === 'NOT_MET');
  const unknown = results.filter((r) => r.state === 'UNKNOWN');
  const human = results.filter((r) => r.state === 'HUMAN');
  const met = results.filter((r) => r.state === 'MET');

  // Deliberately blunt about what each verdict means, because the difference
  // between "you are blocked" and "we cannot tell" is the whole point.
  let verdict, verdictLine;
  if (notMet.length > 0) {
    verdict = 'BLOCKED';
    verdictLine = notMet.length === 1
      ? 'One published criterion is not met.'
      : `${notMet.length} published criteria are not met.`;
  } else if (unknown.length > 0) {
    verdict = 'INCOMPLETE';
    verdictLine = `Nothing rules this out, but ${unknown.length} ${unknown.length === 1 ? 'fact is' : 'facts are'} missing from your profile.`;
  } else {
    verdict = 'CLEAR';
    verdictLine = human.length > 0
      ? `Every criterion we can check is satisfied. ${human.length} ${human.length === 1 ? 'is' : 'are'} judged by a person reading your application.`
      : 'Every published criterion we can check is satisfied.';
  }

  // A deadline that has passed does not change eligibility, but a founder
  // reading this needs to know before spending a weekend on it.
  let deadline = null;
  if (scheme.deadline) {
    const passed = new Date(scheme.deadline.date) < new Date();
    deadline = { ...scheme.deadline, passed };
  }

  return {
    id: scheme.id,
    name: scheme.name,
    authority: scheme.authority,
    oneLine: scheme.oneLine,
    worth: scheme.worth,
    cost: scheme.cost,
    howItWorks: scheme.howItWorks || null,
    applyAt: scheme.applyAt,
    source: scheme.source,
    verifiedOn: scheme.verifiedOn,
    isGateway: Boolean(scheme.isGateway),
    requiresDpiit: Boolean(scheme.requiresDpiit),
    deadline,
    verdict,
    verdictLine,
    criteria: results,
    counts: { met: met.length, notMet: notMet.length, unknown: unknown.length, human: human.length },
  };
}

async function getSchemesFor(startupId, userId) {
  const venture = await getVenture(startupId);
  if (!venture) return { success: false, error: 'NOT_FOUND' };

  // Only the founder and co-founders. Eligibility is derived from facts about
  // the company that are not public on this platform.
  const owns = await pool.query(
    `SELECT 1 FROM startups s WHERE s.id = $1 AND (s.founder_id = $2
       OR EXISTS (SELECT 1 FROM startup_team_members tm
                  WHERE tm.startup_id = s.id AND tm.user_id = $2 AND tm.is_founder = true))`,
    [startupId, userId]
  );
  if (owns.rows.length === 0) return { success: false, error: 'NOT_YOURS' };

  const evaluated = SCHEMES.map((s) => evaluate(s, venture));

  // Order by what a founder should do first: what they can act on now, then
  // what is missing a fact, then what is genuinely closed.
  const rank = { CLEAR: 0, INCOMPLETE: 1, BLOCKED: 2 };
  evaluated.sort((a, b) => {
    if (rank[a.verdict] !== rank[b.verdict]) return rank[a.verdict] - rank[b.verdict];
    // Within a band, the gateway first: DPIIT unlocks most of the rest.
    return (b.isGateway ? 1 : 0) - (a.isGateway ? 1 : 0);
  });

  // The single most useful sentence on the page, computed rather than written.
  const dpiit = evaluated.find((s) => s.id === 'DPIIT');
  const blockedOnDpiit = evaluated.filter((s) => s.requiresDpiit && s.verdict === 'BLOCKED');
  let headline = null;
  if (dpiit && dpiit.verdict !== 'BLOCKED' && !venture.dpiit_recognized && blockedOnDpiit.length > 0) {
    headline = `${blockedOnDpiit.length} of these are closed only because this venture is not DPIIT recognised. That recognition is free and issued in days.`;
  }

  const missingFacts = [];
  if (!venture.entity_type) missingFacts.push('how the venture is incorporated');
  if (!venture.incorporation_date) missingFacts.push('the incorporation date');
  if (venture.prior_govt_funding_lakhs === null || venture.prior_govt_funding_lakhs === undefined) {
    missingFacts.push('whether it has taken government money before');
  }

  return {
    success: true,
    venture: {
      id: venture.id, name: venture.name, stage: venture.stage,
      dpiitRecognized: venture.dpiit_recognized,
      entityType: venture.entity_type,
      incorporationDate: venture.incorporation_date,
      priorGovtFundingLakhs: venture.prior_govt_funding_lakhs,
    },
    schemes: evaluated,
    headline,
    missingFacts,
    verifiedOn: VERIFIED_ON,
  };
}

/** The three facts the checks turn on. Nothing else is editable here. */
async function updateSchemeFacts(userId, startupId, input = {}) {
  const owns = await pool.query(
    `SELECT 1 FROM startups s WHERE s.id = $1 AND (s.founder_id = $2
       OR EXISTS (SELECT 1 FROM startup_team_members tm
                  WHERE tm.startup_id = s.id AND tm.user_id = $2 AND tm.is_founder = true))`,
    [startupId, userId]
  );
  if (owns.rows.length === 0) return { success: false, error: 'NOT_YOURS' };

  const VALID_ENTITIES = ['PRIVATE_LIMITED', 'LLP', 'REGISTERED_PARTNERSHIP', 'COOPERATIVE_SOCIETY', 'SOLE_PROPRIETORSHIP', 'NOT_INCORPORATED'];
  const fields = [];
  const values = [];
  const add = (col, val) => { values.push(val); fields.push(`${col} = $${values.length + 1}`); };

  if (input.entityType !== undefined) {
    if (input.entityType && !VALID_ENTITIES.includes(input.entityType)) return { success: false, error: 'INVALID_ENTITY_TYPE' };
    add('entity_type', input.entityType || null);
  }
  if (input.incorporationDate !== undefined) {
    const d = input.incorporationDate ? new Date(input.incorporationDate) : null;
    if (d && Number.isNaN(d.getTime())) return { success: false, error: 'INVALID_DATE' };
    if (d && d > new Date()) return { success: false, error: 'DATE_IN_FUTURE' };
    add('incorporation_date', input.incorporationDate || null);
  }
  if (input.priorGovtFundingLakhs !== undefined) {
    const n = input.priorGovtFundingLakhs === null || input.priorGovtFundingLakhs === ''
      ? null : parseFloat(input.priorGovtFundingLakhs);
    if (n !== null && (Number.isNaN(n) || n < 0)) return { success: false, error: 'INVALID_AMOUNT' };
    add('prior_govt_funding_lakhs', n);
  }
  if (input.dpiitRecognized !== undefined) add('dpiit_recognized', Boolean(input.dpiitRecognized));

  if (fields.length === 0) return { success: false, error: 'NOTHING_TO_UPDATE' };

  await pool.query(`UPDATE startups SET ${fields.join(', ')} WHERE id = $1`, [startupId, ...values]);
  return { success: true };
}

module.exports = { getSchemesFor, updateSchemeFacts, evaluate };
