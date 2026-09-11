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

/**
 * Cached alignment for ONE user across MANY ventures.
 *
 * getAlignmentScores in alignmentService answers the contributor-side
 * question: for one gap's venture, how do these candidates align? Investors
 * need the inverse. Using the wrong one here would have returned an empty
 * map silently and made alignment look like it simply never fired.
 */
async function getAlignmentScoresForStartups(userId, startupIds) {
  if (!startupIds || startupIds.length === 0) return {};
  const result = await pool.query(
    `SELECT startup_id, score, reason FROM alignment_scores
     WHERE user_id = $1 AND startup_id = ANY($2::uuid[])`,
    [userId, startupIds]
  );
  const map = {};
  for (const r of result.rows) {
    map[r.startup_id] = { score: parseFloat(r.score), reason: r.reason };
  }
  return map;
}

const WEIGHTS = {
  domainFit: 0.24,
  stageFit: 0.16,
  readinessSignal: 0.18,
  riskSignal: 0.10,
  geographyFit: 0.08,
  ticketFit: 0.06,
  // The investor's own thesis, judged by an LLM against what each venture is
  // actually building. This was collected at onboarding, shown on their
  // profile, and used for NOTHING: deal flow ranked purely on domain, stage,
  // readiness and risk, so an investor who wrote that they back technical
  // founders in regulated markets and pass on consumer social got no credit
  // for any of it.
  //
  // 18 percent, taken proportionally from the mechanical signals. Slightly
  // more than a core hire gets on the contributor side, because an investor's
  // thesis is a more deliberate and more specific statement than most
  // contributors write, and less than a co-founder gets, because an investor
  // is not committing years of their life.
  alignmentFit: 0.18
};

function scoreStartupForInvestor(investor, startup, readiness, risks, feedbackAdjustment = 0, alignment = null) {
  const investorDomains = (investor.preferred_domains || []).map(d => d.toLowerCase().trim());
  const startupDomains = (startup.domain || []).map(d => d.toLowerCase().trim());
  // Real fix: same brittleness already found and fixed for skill
  // matching (exact string equality treating 'aml' and 'aml kyc' as
  // unrelated) exists here too — 'cybersecurity' vs 'cyber security',
  // 'legal tech' vs 'legaltech', etc. Fixed the same way: real
  // substring/token overlap, not just character-for-character equality.
  // CONFIRMED: this had the same unguarded token matching that produced
  // cross-domain false positives on the contributor side, and no
  // equivalence groups, so an investor whose thesis says 'fintech' scored
  // zero against a venture whose domain is 'financial services'.
  //
  // Now uses the SINGLE shared implementation from matchingService rather
  // than a second divergent copy. Two copies of matching logic is how the
  // investor side silently fell behind the contributor side in the first
  // place.
  const { domainsMatch } = require('../matching/matchingService');
  const domainOverlap = investorDomains.filter(d => startupDomains.some(sd => domainsMatch(d, sd)));
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

  const alignmentFit = typeof alignment?.score === 'number' ? alignment.score : null;
  const breakdown = { domainFit, stageFit, readinessSignal, riskSignal, geographyFit, ticketFit, alignmentFit };
  if (alignment?.reason) breakdown.alignmentReason = alignment.reason;

  // NULL-SAFE, not zero-safe. An investor who has not written a thesis, or a
  // venture with no founder vision, produces no alignment score. Multiplying
  // null by its weight yields zero, which would silently cost that pair 18
  // percent and rank an UNSCORED venture below a genuinely misaligned one.
  // The missing dimension is dropped and the rest renormalised, exactly as on
  // the contributor side, so a score always means the same thing: computed
  // from the evidence that exists.
  const active = {};
  let total = 0;
  for (const k of Object.keys(WEIGHTS)) {
    if (breakdown[k] === null || breakdown[k] === undefined) continue;
    active[k] = WEIGHTS[k];
    total += WEIGHTS[k];
  }
  const baseScore = total > 0
    ? Object.keys(active).reduce((sum, k) => sum + breakdown[k] * (active[k] / total), 0)
    : 0;
  const finalScore = Math.max(Math.min(baseScore + feedbackAdjustment, 1), 0);
  breakdown.feedbackAdjustment = feedbackAdjustment;

  return { score: Math.round(finalScore * 100) / 100, breakdown, domainOverlap };
}

function explainInvestorScore(breakdown, domainOverlap, risks) {
  const strengths = [];
  const watch = [];

  // The LLM's own sentence about this venture against THIS investor's thesis,
  // referring to something they actually wrote. Leads, because it is the only
  // part of the explanation that is specific to them rather than to the
  // venture's surface facts.
  if (typeof breakdown.alignmentFit === 'number' && breakdown.alignmentReason) {
    if (breakdown.alignmentFit >= 0.6) strengths.push(breakdown.alignmentReason);
    else if (breakdown.alignmentFit <= 0.3) watch.push(breakdown.alignmentReason);
  }

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

  const { getPreferenceAdjustment } = require('../feedback/feedbackService');

  // Phase H — real curation/selectivity: readiness previously only
  // affected SCORE (20% weight), meaning every venture regardless of
  // quality still appeared in deal-flow, just ranked lower — genuine
  // noise, not curation. A venture must cross a real readiness bar to
  // be investor-facing at all, matching how real selective platforms
  // actually work: not everyone gets shown, not just everyone ranked.
  const MIN_READINESS_FOR_INVESTOR_VISIBILITY = 35;

  // One cached lookup for every venture at once, before the loop. Reading
  // cache only: ranking never calls the LLM, so a rate limit can never slow
  // or break deal flow. Same discipline as the contributor side.
  let alignmentByStartup = {};
  try {
    const ids = startupsResult.rows.map(r => r.id);
    alignmentByStartup = await getAlignmentScoresForStartups(investorUserId, ids);
  } catch (err) {
    console.error('Investor alignment lookup failed (non-fatal, deterministic signals still apply):', err.message);
  }

  const ranked = [];
  for (const startup of startupsResult.rows) {
    const readinessResult = await pool.query(
      'SELECT * FROM readiness_assessments WHERE startup_id = $1 ORDER BY generated_at DESC LIMIT 1',
      [startup.id]
    );
    const latestReadiness = readinessResult.rows[0];

    // Real admission gate — an unassessed venture hasn't proven itself
    // yet either, so it doesn't qualify until it has a real score.
    if (!latestReadiness || latestReadiness.overall_score < MIN_READINESS_FOR_INVESTOR_VISIBILITY) continue;

    const risksResult = await pool.query('SELECT * FROM risks WHERE startup_id = $1', [startup.id]);

    const signalKeys = [`stage:${(startup.stage || '').toLowerCase()}`, ...(startup.domain || []).map(d => `domain:${d.toLowerCase()}`)];
    const feedbackAdjustment = await getPreferenceAdjustment(investorUserId, signalKeys);

    const { score, breakdown, domainOverlap } = scoreStartupForInvestor(
      investor, startup, latestReadiness, risksResult.rows, feedbackAdjustment,
      alignmentByStartup[startup.id] || null
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
    return {
      success: true,
      recommendations: inserted,
      note: inserted.length === 0 ? `${startupsResult.rows.length} startups exist, but none have yet crossed the ${MIN_READINESS_FOR_INVESTOR_VISIBILITY}-point readiness bar for investor visibility.` : undefined
    };
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
