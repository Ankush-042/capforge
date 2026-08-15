const pool = require('../shared/db');

async function matchOpportunitiesForStartup(startupId) {
  const startupResult = await pool.query('SELECT domain, stage FROM startups WHERE id = $1', [startupId]);
  if (startupResult.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const startup = startupResult.rows[0];

  const result = await pool.query(
    `SELECT * FROM opportunities WHERE (domain && $1::text[] OR stage && $2::text[]) ORDER BY deadline ASC NULLS LAST LIMIT 20`,
    [startup.domain || [], [startup.stage]]
  );
  return { success: true, opportunities: result.rows };
}

async function createOpportunity(data) {
  const { name, type, provider, description, eligibility, domain, stage, geography, url, deadline } = data;
  const result = await pool.query(
    `INSERT INTO opportunities (name, type, provider, description, eligibility, domain, stage, geography, url, deadline)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [name, type, provider, description, eligibility, domain || [], stage || [], geography || [], url, deadline || null]
  );
  return { success: true, opportunity: result.rows[0] };
}

module.exports = { matchOpportunitiesForStartup, createOpportunity };
