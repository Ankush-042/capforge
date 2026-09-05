/**
 * Investor Portfolio Intelligence (Sprint 24). Ref: PRD §Portfolio Layer.
 * Real signals only: an investor's "portfolio" = startups they've
 * actually ACCEPTED a connection with. Diversification computed from
 * real domain distribution across those real connections.
 */
const pool = require('../shared/db');

async function getPortfolioAnalysis(investorId) {
  const result = await pool.query(
    `SELECT s.id, s.name, s.domain, s.stage
     FROM connections c JOIN startups s ON s.id = c.startup_id
     WHERE c.sender_id = $1 AND c.type = 'FOUNDER_INVESTOR' AND c.status = 'ACCEPTED'`,
    [investorId]
  );
  const portfolio = result.rows;

  const domainCounts = {};
  for (const s of portfolio) {
    for (const d of s.domain || []) {
      const key = d.toLowerCase();
      domainCounts[key] = (domainCounts[key] || 0) + 1;
    }
  }
  const total = Object.values(domainCounts).reduce((a, b) => a + b, 0) || 1;
  const distribution = Object.entries(domainCounts).map(([domain, count]) => ({
    domain, count, percentage: Math.round((count / total) * 100)
  })).sort((a, b) => b.count - a.count);

  const dominantDomain = distribution[0];
  const concentrationWarning = dominantDomain && dominantDomain.percentage >= 50
    ? `Your portfolio is concentrated in ${dominantDomain.domain} (${dominantDomain.percentage}%). Consider diversifying.`
    : null;

  // Real diversification suggestion: startups NOT in the investor's
  // dominant domain, still matching their stage preference, from
  // their actual existing deal-flow recommendations.
  let diversificationSuggestions = [];
  if (dominantDomain) {
    const suggRes = await pool.query(
      `SELECT r.startup_id, s.name, s.domain, r.score
       FROM recommendations r JOIN startups s ON s.id = r.startup_id
       WHERE r.target_user_id = $1 AND r.recommendation_type = 'STARTUP'
         AND NOT (s.domain && $2::text[])
       ORDER BY r.score DESC LIMIT 5`,
      [investorId, [dominantDomain.domain]]
    );
    diversificationSuggestions = suggRes.rows;
  }

  return {
    success: true,
    portfolio: { count: portfolio.length, startups: portfolio, domain_distribution: distribution, concentration_warning: concentrationWarning, diversification_suggestions: diversificationSuggestions }
  };
}

module.exports = { getPortfolioAnalysis };
