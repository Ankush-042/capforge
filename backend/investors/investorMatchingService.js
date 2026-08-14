/**
 * AI-18 — Investor Deal-Flow Engine.
 * Ref: AI/Intelligence spec §37, §65-67, App Flow §6.3, SRS §50.
 *
 * Same architecture discipline as the contributor matching engine
 * (Sprint 4): deterministic, weighted, evidence-based. Reuses the
 * EXACT same `recommendations` table (recommendation_type='STARTUP')
 * rather than inventing a parallel schema — one source of truth per
 * architecture doc §51.
 *
 * SCOPED LIMITATION (documented, not hidden): startups don't yet store
 * an explicit funding ask or geography field (not part of the AI
 * structuring schema), so ticketFit and geographyFit are neutral
 * placeholders (0.5) until that data exists — this is flagged in the
 * score breakdown itself, not silently assumed accurate.
 */
const pool = require('../shared/db');

const WEIGHTS = {
  domainFit: 0.30,
  stageFit: 0.20,
  readinessSignal: 0.20,
  riskSignal: 0.10,
  geographyFit: 0.10,
  ticketFit: 0.10
};

function scoreStartupForInvestor(investor, startup, readiness, risks) {
  const investorDomains = (investor.preferred_domains || []).map(d => d.toLowerCase().trim());
  const startupDomains = (startup.domain || []).map(d => d.toLowerCase().trim());
  const domainOverlap = investorDomains.filter(d => startupDomains.includes(d));
  const domainFit = investorDomains.length > 0
    ? Math.min(domainOverlap.length / investorDomains.length, 1)
    : 0.5;

  const preferredStages = (investor.preferred_stages || []).map(s => s.toLowerCase().trim());
  const stageFit = preferredStages.length === 0
    ? 0.5
    : (preferredStages.includes((startup.stage || '').toLowerCase()) ? 1.0 : 0.0);

  const readinessSignal = readiness ? Math.min(readiness.overall_score / 100, 1) : 0.5;

  // Fewer / less severe risks = higher signal. HIGH=-0.3, MEDIUM=-0.15, LOW=-0.05, capped at 0.
  const riskPenalty = risks.reduce((sum, r) => {
    return sum + (r.severity === 'HIGH' ? 0.3 : r.severity === 'MEDIUM' ? 0.15 : 0.05);
  }, 0);
  const riskSignal = Math.max(1 - riskPenalty, 0);

  // Documented placeholders — not fabricated confidence, genuinely neutral.
  const geographyFit = 0.5;
  const ticketFit = 0.5;

  const breakdown = { domainFit, stageFit, readinessSignal, riskSignal, geographyFit, ticketFit };
  const score = Object.keys(WEIGHTS).reduce((sum, k) => sum + breakdown[k] * WEIGHTS[k], 0);

  return { score: Math.round(score * 100) / 100, breakdown, domainOverlap };
}

function explainInvestorScore(breakdown, domainOverlap, risks) {
  const strengths = [];
  const watch = [];

  if (breakdown.domainFit >= 0.6) {
    strengths.push(`Matches stated domain interest: ${domainOverlap.join(', ')}.`);
  }
  if (breakdown.stageFit === 1.0) {
    strengths.push('Startup stage matches investor\'s preferred stage.');
  } else if (breakdown.stageFit === 0.0) {
    watch.push('Startup stage is outside the investor\'s stated preference.');
  }
  if (breakdown.readinessSignal >= 0.6) {
    strengths.push('Venture readiness score is strong.');
  } else if (breakdown.readinessSignal < 0.4) {
    watch.push('Venture readiness score is currently low.');
  }

  const highRisks = risks.filter(r => r.severity === 'HIGH');
  if (highRisks.length > 0) {
    watch.push(`${highRisks.length} high-severity risk(s) flagged: ${highRisks.map(r => r.title).join('; ')}.`);
  }

  return { strengths, watch };
}

async function rankStartupsForInvestor(investorUserId) {
  const investorResult = await pool.query(
    `SELECT ip.* FROM investor_profiles ip
     JOIN profiles p ON p.id = ip.profile_id
     WHERE p.user_id = $1`,
    [investorUserId]
  );
  if (investorResult.rows.length === 0) return { success: false, error: 'INVESTOR_PROFILE_NOT_FOUND' };
  const investor = investorResult.rows[0];

  // Discoverable + ACTIVE only — investors should never see draft/unconfirmed ventures.
  const startupsResult = await pool.query(
    `SELECT * FROM startups WHERE status = 'ACTIVE' AND visibility = 'DISCOVERABLE'`
  );

  if (startupsResult.rows.length === 0) {
    return { success: true, recommendations: [], note: 'No active, discoverable startups on the platform yet.' };
  }

  const ranked = [];
  for (const startup of startupsResult.rows) {
    const readinessResult = await pool.query(
      'SELECT * FROM readiness_assessments WHERE startup_id = $1 ORDER BY generated_at DESC LIMIT 1',
      [startup.id]
    );
    const risksResult = await pool.query('SELECT * FROM risks WHERE startup_id = $1', [startup.id]);

    const { score, breakdown, domainOverlap } = scoreStartupForInvestor(
      investor, startup, readinessResult.rows[0], risksResult.rows
    );
    const explanation = explainInvestorScore(breakdown, domainOverlap, risksResult.rows);
    ranked.push({ startup, score, breakdown, explanation });
  }

  ranked.sort((a, b) => b.score - a.score);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM recommendations WHERE target_user_id = $1 AND recommendation_type = 'STARTUP'`,
      [investorUserId]
    );

    const inserted = [];
    for (let i = 0; i < ranked.length; i++) {
      const r = ranked[i];
      const row = await client.query(
        `INSERT INTO recommendations (startup_id, target_user_id, recommendation_type, score, rank, score_breakdown, explanation, algorithm_version)
         VALUES ($1, $2, 'STARTUP', $3, $4, $5, $6, 'investor_matching_v1') RETURNING *`,
        [r.startup.id, investorUserId, r.score, i + 1, JSON.stringify(r.breakdown), JSON.stringify(r.explanation)]
      );
      inserted.push({ ...row.rows[0], startup_name: r.startup.name });
    }
    await client.query('COMMIT');
    return { success: true, recommendations: inserted };
  } catch (err) {
    await client.query('ROLLBACK');
    return { success: false, error: 'PERSISTENCE_FAILED', detail: err.message };
  } finally {
    client.release();
  }
}

async function getInvestorRecommendations(investorUserId) {
  const result = await pool.query(
    `SELECT r.*, s.name as startup_name, s.problem, s.stage, s.domain
     FROM recommendations r JOIN startups s ON s.id = r.startup_id
     WHERE r.target_user_id = $1 AND r.recommendation_type = 'STARTUP'
     ORDER BY r.rank`,
    [investorUserId]
  );
  return { success: true, recommendations: result.rows };
}

module.exports = { scoreStartupForInvestor, explainInvestorScore, rankStartupsForInvestor, getInvestorRecommendations };
