/**
 * What an investor is actually tracking.
 *
 * Before this, an investor could browse and message and nothing else. No way
 * to mark a venture they were watching, no way to record why they passed, no
 * way to be told when something they liked crossed the readiness bar. Every
 * other role on this platform has state; the investor had none.
 *
 * It also replaces the portfolio page's dependency on the dead `connections`
 * table, which no live route has written to since conversations replaced it.
 * That was the fourth place still reading it.
 *
 * ON THE WORD "PORTFOLIO": this platform does not process investments and has
 * no knowledge of who actually funded whom. Showing holdings we cannot know
 * would be a lie. What we genuinely know is what someone is watching and what
 * they passed on, so that is what is shown and what it is called.
 */
const pool = require('../shared/db');

const INVESTOR_BAR = 35;

async function currentReadiness(startupId) {
  const r = await pool.query(
    `SELECT overall_score FROM readiness_assessments
     WHERE startup_id = $1 ORDER BY generated_at DESC LIMIT 1`,
    [startupId]
  );
  return r.rows[0] ? Math.round(parseFloat(r.rows[0].overall_score)) : null;
}

/** Start watching, or record a pass with the reasoning behind it. */
async function setWatchStatus(investorId, startupId, status, note) {
  if (!['WATCHING', 'PASSED'].includes(status)) {
    return { success: false, error: 'INVALID_STATUS' };
  }

  const exists = await pool.query(`SELECT 1 FROM startups WHERE id = $1`, [startupId]);
  if (exists.rows.length === 0) return { success: false, error: 'NOT_FOUND' };

  // Captured once, when watching begins, so "it has moved since you started
  // watching" is computable later rather than guessed at.
  const readiness = await currentReadiness(startupId);

  const result = await pool.query(
    `INSERT INTO investor_watchlist (investor_id, startup_id, status, note, readiness_at_watch)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (investor_id, startup_id) DO UPDATE
       SET status = EXCLUDED.status,
           note = COALESCE(EXCLUDED.note, investor_watchlist.note),
           updated_at = now()
     RETURNING *`,
    [investorId, startupId, status, note || null, readiness]
  );
  return { success: true, entry: result.rows[0] };
}

async function removeFromWatchlist(investorId, startupId) {
  await pool.query(
    `DELETE FROM investor_watchlist WHERE investor_id = $1 AND startup_id = $2`,
    [investorId, startupId]
  );
  return { success: true };
}

/**
 * Everything they are tracking, with what has changed since they started.
 *
 * The movement is the point. A venture sitting at the same score for months
 * and one that has climbed eight points are completely different propositions,
 * and an investor who marked both on the same day has no way to tell them
 * apart otherwise.
 */
async function getWatchlist(investorId) {
  const rows = await pool.query(
    `SELECT w.*, s.name, s.domain, s.stage, s.problem, s.founder_id,
            (SELECT overall_score FROM readiness_assessments ra
             WHERE ra.startup_id = s.id ORDER BY ra.generated_at DESC LIMIT 1) AS current_score
     FROM investor_watchlist w
     JOIN startups s ON s.id = w.startup_id
     WHERE w.investor_id = $1
     ORDER BY w.updated_at DESC`,
    [investorId]
  );

  const entries = rows.rows.map((r) => {
    const current = r.current_score !== null ? Math.round(parseFloat(r.current_score)) : null;
    const start = r.readiness_at_watch;
    const moved = current !== null && start !== null ? current - start : null;

    return {
      startupId: r.startup_id,
      name: r.name,
      domain: r.domain,
      stage: r.stage,
      problem: r.problem,
      founderId: r.founder_id,
      status: r.status,
      note: r.note,
      watchedSince: r.created_at,
      readinessAtWatch: start,
      currentReadiness: current,
      moved,
      visibleToInvestors: current !== null && current >= INVESTOR_BAR,
      // The thing worth surfacing: it was below the bar when they started
      // watching and is above it now. That is the moment to look again.
      crossedTheBar: start !== null && current !== null && start < INVESTOR_BAR && current >= INVESTOR_BAR,
    };
  });

  return {
    success: true,
    watching: entries.filter((e) => e.status === 'WATCHING'),
    passed: entries.filter((e) => e.status === 'PASSED'),
  };
}

/** Whether this investor already tracks this venture, for button state. */
async function getWatchState(investorId, startupId) {
  const r = await pool.query(
    `SELECT status, note FROM investor_watchlist WHERE investor_id = $1 AND startup_id = $2`,
    [investorId, startupId]
  );
  return { success: true, state: r.rows[0] || null };
}

module.exports = { setWatchStatus, removeFromWatchlist, getWatchlist, getWatchState };
