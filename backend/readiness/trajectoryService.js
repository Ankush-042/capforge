/**
 * How a venture got to where it is.
 *
 * An investor sees a single frozen number: "readiness 48". A venture stuck at
 * 48 for two months and one that climbed there in three weeks are completely
 * different propositions, and the platform could not tell them apart.
 *
 * WHAT MAKES THIS USEFUL IS NOT THE CURVE. Readiness only moves when it is
 * recomputed, so a line on its own says little. What says something is WHY it
 * moved: a role filled, a product put up, somebody joining. So the events are
 * placed against the line and each change is attributed where an attribution
 * is honest.
 *
 * Nothing here is inferred. Every event is a real row with a real timestamp,
 * and where a cause cannot be established the change is shown without one
 * rather than given a plausible story.
 */
const pool = require('../shared/db');

async function getTrajectory(startupId) {
  const startup = (await pool.query(
    `SELECT id, name, stage, created_at FROM startups WHERE id = $1`, [startupId]
  )).rows[0];
  if (!startup) return { success: false, error: 'NOT_FOUND' };

  const [assessments, joins, launches, gapsFilled] = await Promise.all([
    pool.query(
      `SELECT overall_score, generated_at FROM readiness_assessments
       WHERE startup_id = $1 ORDER BY generated_at ASC`, [startupId]
    ),
    pool.query(
      `SELECT tm.joined_at, tm.role, p.display_name
       FROM startup_team_members tm
       JOIN profiles p ON p.user_id = tm.user_id
       WHERE tm.startup_id = $1 AND tm.is_founder = false
       ORDER BY tm.joined_at ASC`, [startupId]
    ),
    pool.query(
      `SELECT l.id, l.title, l.posted_at,
              (SELECT COUNT(DISTINCT c.author_id)::int FROM launch_comments c WHERE c.launch_id = l.id) AS people
       FROM launches l WHERE l.startup_id = $1 ORDER BY l.posted_at ASC`, [startupId]
    ),
    pool.query(
      `SELECT role, updated_at FROM gaps
       WHERE startup_id = $1 AND status = 'FILLED' ORDER BY updated_at ASC`, [startupId]
    ),
  ]);

  const points = assessments.rows.map((a) => ({
    score: Math.round(parseFloat(a.overall_score)),
    at: a.generated_at,
  }));

  const events = [
    ...joins.rows.map((j) => ({
      at: j.joined_at, kind: 'JOINED',
      text: `${j.display_name} joined as ${j.role}`,
    })),
    ...launches.rows.map((l) => ({
      at: l.posted_at, kind: 'LAUNCHED',
      text: l.people > 0
        ? `Put up "${l.title}" — ${l.people} ${l.people === 1 ? 'person has' : 'people have'} responded`
        : `Put up "${l.title}"`,
      launchId: l.id,
    })),
    ...gapsFilled.rows.map((g) => ({
      at: g.updated_at, kind: 'ROLE_FILLED',
      text: `${g.role} role filled`,
    })),
  ].filter((e) => e.at).sort((a, b) => new Date(a.at) - new Date(b.at));

  // Attribute a change only where an event genuinely sits between two
  // assessments. Anything else is left unexplained rather than guessed at.
  const changes = [];
  for (let i = 1; i < points.length; i++) {
    const delta = points[i].score - points[i - 1].score;
    if (delta === 0) continue;
    const between = events.filter((e) =>
      new Date(e.at) > new Date(points[i - 1].at) && new Date(e.at) <= new Date(points[i].at));
    changes.push({ from: points[i - 1].score, to: points[i].score, delta, at: points[i].at, because: between });
  }

  const first = points[0] || null;
  const latest = points[points.length - 1] || null;
  const daysTracked = first && latest
    ? Math.round((new Date(latest.at) - new Date(first.at)) / 86400000) : 0;

  // The honest headline. Movement, or the absence of it, stated plainly.
  let summary;
  if (!latest) summary = 'Never assessed, so there is nothing to show yet.';
  else if (points.length === 1) summary = 'Assessed once, so there is no movement to read yet.';
  else {
    const climb = latest.score - first.score;
    const sinceLast = Math.round((Date.now() - new Date(latest.at).getTime()) / 86400000);
    summary = climb > 0
      ? `Up ${climb} points over ${daysTracked} days, last measured ${sinceLast === 0 ? 'today' : `${sinceLast} days ago`}.`
      : climb < 0
        ? `Down ${Math.abs(climb)} points over ${daysTracked} days.`
        : `Unchanged over ${daysTracked} days.`;
  }

  return {
    success: true,
    venture: { id: startup.id, name: startup.name, stage: startup.stage },
    points,
    events,
    changes,
    summary,
    latest: latest ? latest.score : null,
    // Stated rather than hidden: a venture nobody has reassessed looks static
    // because nobody measured it, not because nothing happened.
    staleDays: latest ? Math.round((Date.now() - new Date(latest.at).getTime()) / 86400000) : null,
  };
}

module.exports = { getTrajectory };
