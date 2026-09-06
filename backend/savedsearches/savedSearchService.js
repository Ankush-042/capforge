/**
 * Phase F — real saved searches. Ref: direct request — "notify me when
 * a new pre-seed fintech venture appears" is how real angels/VCs
 * actually operate, not just passive algorithmic deal-flow.
 */
const pool = require('../shared/db');
const { searchStartups } = require('../search/searchService');

async function createSavedSearch(userId, name, filters) {
  if (!name || !name.trim()) return { success: false, error: 'MISSING_NAME' };
  const result = await pool.query(
    `INSERT INTO saved_searches (user_id, name, filters) VALUES ($1, $2, $3) RETURNING *`,
    [userId, name.trim(), JSON.stringify(filters || {})]
  );
  return { success: true, savedSearch: result.rows[0] };
}

async function getMySavedSearches(userId) {
  const result = await pool.query('SELECT * FROM saved_searches WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return { success: true, savedSearches: result.rows };
}

async function deleteSavedSearch(id, userId) {
  const result = await pool.query('DELETE FROM saved_searches WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
  if (result.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  return { success: true };
}

/** Real, manual re-run — executes the saved filters against the live search index right now. */
async function runSavedSearch(id, userId) {
  const searchResult = await pool.query('SELECT * FROM saved_searches WHERE id = $1 AND user_id = $2', [id, userId]);
  if (searchResult.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const saved = searchResult.rows[0];

  const results = await searchStartups(saved.filters, userId);
  await pool.query('UPDATE saved_searches SET last_run_at = now() WHERE id = $1', [id]);
  return { success: true, results: results.results, savedSearch: saved };
}

module.exports = { createSavedSearch, getMySavedSearches, deleteSavedSearch, runSavedSearch };
