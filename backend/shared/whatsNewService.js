/**
 * What has changed since you were last here.
 *
 * Every screen shows current state. Nothing showed a delta. That is the single
 * most common reason a person reopens a product, and it was missing entirely.
 *
 * HONESTY RULES THIS FOLLOWS
 * - Nothing is invented to fill the space. If nothing happened, it says so
 *   plainly rather than padding with "your readiness is 43", which is not news.
 * - First visit is not treated as "nothing new". It is a different state and
 *   says so, because "nothing has changed" is wrong when there is no baseline.
 * - Everything counted is a real row with a real timestamp. No estimates.
 */
const pool = require('../shared/db');

async function getWhatsNew(userId, role) {
  const userRes = await pool.query(
    `SELECT previous_session_at, last_seen_at FROM users WHERE id = $1`,
    [userId]
  );
  if (userRes.rows.length === 0) return { success: false, error: 'NOT_FOUND' };

  const since = userRes.rows[0].previous_session_at;

  // No baseline yet. Saying "nothing has changed" would be wrong, not merely
  // unhelpful: nothing has been measured.
  if (!since) return { success: true, firstVisit: true, since: null, items: [] };

  const items = [];

  // Unread messages are the same for everyone and matter most: someone is
  // waiting on a reply.
  const msgs = await pool.query(
    `SELECT COUNT(DISTINCT c.id)::int AS n
     FROM conversations c
     JOIN messages m ON m.conversation_id = c.id
     WHERE (c.participant_a_id = $1 OR c.participant_b_id = $1)
       AND m.sender_id != $1 AND m.created_at > $2`,
    [userId, since]
  );
  if (msgs.rows[0].n > 0) {
    items.push({
      kind: 'MESSAGES',
      count: msgs.rows[0].n,
      text: `${msgs.rows[0].n} ${msgs.rows[0].n === 1 ? 'conversation has' : 'conversations have'} new messages`,
      to: '/app/inbox',
    });
  }

  if (role === 'FOUNDER') {
    const ventures = await pool.query(`SELECT id FROM startups WHERE founder_id = $1`, [userId]);
    const ids = ventures.rows.map((v) => v.id);

    if (ids.length > 0) {
      // New people ranked against their open roles. This is the answer to
      // "is it worth opening this again".
      const cands = await pool.query(
        `SELECT COUNT(*)::int AS n
         FROM recommendations r
         JOIN gaps g ON g.id = r.source_gap_id
         WHERE r.startup_id = ANY($1::uuid[]) AND r.recommendation_type = 'CONTRIBUTOR'
           AND r.status = 'ACTIVE' AND g.status NOT IN ('FILLED','DISMISSED')
           AND r.created_at > $2 AND r.score >= 0.20`,
        [ids, since]
      );
      if (cands.rows[0].n > 0) {
        items.push({
          kind: 'CANDIDATES',
          count: cands.rows[0].n,
          text: `${cands.rows[0].n} new ${cands.rows[0].n === 1 ? 'person matches' : 'people match'} your open roles`,
          to: '/app/which-role',
        });
      }

      // Someone actually joined. The most important thing that can happen.
      const joined = await pool.query(
        `SELECT p.display_name, tm.role
         FROM startup_team_members tm JOIN profiles p ON p.user_id = tm.user_id
         WHERE tm.startup_id = ANY($1::uuid[]) AND tm.joined_at > $2`,
        [ids, since]
      );
      for (const j of joined.rows) {
        items.push({
          kind: 'JOINED',
          text: `${j.display_name} joined as ${j.role || 'a team member'}`,
          to: '/app/team',
        });
      }

      // Readiness moved, and by how much. A number changing without anyone
      // saying so is how a founder stops trusting the number.
      const assessments = await pool.query(
        `SELECT overall_score FROM readiness_assessments
         WHERE startup_id = ANY($1::uuid[]) ORDER BY generated_at DESC LIMIT 2`,
        [ids]
      );
      const newer = await pool.query(
        `SELECT COUNT(*)::int AS n FROM readiness_assessments
         WHERE startup_id = ANY($1::uuid[]) AND generated_at > $2`,
        [ids, since]
      );
      if (newer.rows[0].n > 0 && assessments.rows.length === 2) {
        const delta = Math.round(parseFloat(assessments.rows[0].overall_score))
          - Math.round(parseFloat(assessments.rows[1].overall_score));
        if (delta !== 0) {
          items.push({
            kind: 'READINESS',
            text: `Your readiness ${delta > 0 ? 'went up' : 'went down'} ${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'point' : 'points'}`,
            to: '/app/progress',
          });
        }
      }

      // Someone read a spark and wanted in.
      const resonances = await pool.query(
        `SELECT COUNT(*)::int AS n FROM spark_resonances r
         JOIN sparks s ON s.id = r.spark_id
         WHERE s.author_id = $1 AND r.created_at > $2`,
        [userId, since]
      );
      if (resonances.rows[0].n > 0) {
        items.push({
          kind: 'RESONANCE',
          count: resonances.rows[0].n,
          text: `${resonances.rows[0].n} ${resonances.rows[0].n === 1 ? 'person' : 'people'} said they want in on your idea`,
          to: '/app/sparks',
        });
      }
    }
  }

  if (role === 'CONTRIBUTOR') {
    const recs = await pool.query(
      `SELECT COUNT(DISTINCT r.startup_id)::int AS n
       FROM recommendations r
       JOIN gaps g ON g.id = r.source_gap_id
       WHERE r.target_user_id = $1 AND r.recommendation_type = 'CONTRIBUTOR'
         AND r.status = 'ACTIVE' AND g.status NOT IN ('FILLED','DISMISSED')
         AND r.created_at > $2 AND r.score >= 0.20`,
      [userId, since]
    );
    if (recs.rows[0].n > 0) {
      items.push({
        kind: 'OPPORTUNITIES',
        count: recs.rows[0].n,
        text: `${recs.rows[0].n} new ${recs.rows[0].n === 1 ? 'venture needs' : 'ventures need'} what you do`,
        to: '/app/contributor/opportunities',
      });
    }

    const sparks = await pool.query(
      `SELECT COUNT(*)::int AS n FROM sparks
       WHERE status IN ('OPEN','FORMING') AND author_id != $1 AND created_at > $2`,
      [userId, since]
    );
    if (sparks.rows[0].n > 0) {
      items.push({
        kind: 'SPARKS',
        count: sparks.rows[0].n,
        text: `${sparks.rows[0].n} new ${sparks.rows[0].n === 1 ? 'idea was' : 'ideas were'} shared`,
        to: '/app/sparks',
      });
    }
  }

  if (role === 'INVESTOR') {
    const deals = await pool.query(
      `SELECT COUNT(*)::int AS n FROM recommendations
       WHERE target_user_id = $1 AND recommendation_type = 'INVESTOR'
         AND status = 'ACTIVE' AND created_at > $2`,
      [userId, since]
    );
    if (deals.rows[0].n > 0) {
      items.push({
        kind: 'DEALFLOW',
        count: deals.rows[0].n,
        text: `${deals.rows[0].n} new ${deals.rows[0].n === 1 ? 'venture matches' : 'ventures match'} your thesis`,
        to: '/app/investor/deal-flow',
      });
    }
  }

  return { success: true, firstVisit: false, since, items };
}

module.exports = { getWhatsNew };
