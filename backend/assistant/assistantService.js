/**
 * An assistant that can only talk about what is actually true.
 *
 * The rule that makes this worth building at all: it answers ONLY from this
 * venture's real data. Readiness, the real dimension scores, the real open
 * roles, the real risks, the real milestones, the real team. If the answer is
 * not in that data, it says so rather than producing something plausible.
 *
 * A generic startup-advice chatbot would be worse than nothing here, because
 * anyone can already get that elsewhere and it would dilute the one thing
 * this product has: numbers that are genuinely computed rather than asserted.
 *
 * GRACEFUL DEGRADATION IS NON-NEGOTIABLE, and it is tested rather than
 * asserted. When the AI is unavailable for any reason, this returns the real
 * data it would have reasoned over, so the founder still gets the facts and
 * simply loses the prose. An assistant that dies and takes the page with it
 * is a liability; one that degrades to "here are your actual numbers" is not.
 */
const pool = require('../shared/db');
const { callGroq } = require('../shared/aiClient');

const GROQ_MODEL = 'openai/gpt-oss-120b';
const INVESTOR_BAR = 35;

/**
 * Everything true about this venture, assembled once.
 *
 * This is also the fallback payload: if the model never runs, the caller
 * still receives this, which is genuinely useful on its own.
 */
async function gatherContext(startupId) {
  const [startupRes, readinessRes, gapsRes, risksRes, milestonesRes, teamRes] = await Promise.all([
    pool.query(`SELECT * FROM startups WHERE id = $1`, [startupId]),
    pool.query(
      `SELECT overall_score, dimensions, critical_issues, top_actions, generated_at
       FROM readiness_assessments WHERE startup_id = $1 ORDER BY generated_at DESC LIMIT 1`,
      [startupId]
    ),
    pool.query(
      `SELECT role, priority_level, seeking_type, reason, coverage, status
       FROM gaps WHERE startup_id = $1 AND status NOT IN ('FILLED','DISMISSED')`,
      [startupId]
    ),
    pool.query(`SELECT title, severity, category, description, suggested_action FROM risks WHERE startup_id = $1`, [startupId]),
    pool.query(
      `SELECT title, description, status, sequence_order FROM milestones
       WHERE startup_id = $1 ORDER BY sequence_order ASC LIMIT 8`,
      [startupId]
    ),
    pool.query(
      `SELECT tm.role, tm.is_founder, p.display_name, p.headline
       FROM startup_team_members tm JOIN profiles p ON p.user_id = tm.user_id
       WHERE tm.startup_id = $1`,
      [startupId]
    ),
  ]);

  if (startupRes.rows.length === 0) return null;
  const startup = startupRes.rows[0];
  const readiness = readinessRes.rows[0] || null;
  const score = readiness ? Math.round(parseFloat(readiness.overall_score)) : null;

  return {
    startup,
    readiness,
    score,
    visibleToInvestors: score !== null && score >= INVESTOR_BAR,
    pointsFromVisibility: score !== null ? Math.max(0, INVESTOR_BAR - score) : null,
    openGaps: gapsRes.rows,
    risks: risksRes.rows,
    milestones: milestonesRes.rows,
    team: teamRes.rows,
  };
}

/** Render the context as plain text the model can only answer from. */
function renderContext(ctx) {
  const dims = ctx.readiness?.dimensions
    ? Object.entries(ctx.readiness.dimensions)
        .filter(([, v]) => typeof v === 'number')
        .map(([k, v]) => `  ${k.replace(/_/g, ' ')}: ${Math.round(v * 100)}%`)
        .join('\n')
    : '  not assessed';

  return `VENTURE: ${ctx.startup.name}
Field: ${(ctx.startup.domain || []).join(', ') || 'not stated'}
Stage: ${ctx.startup.stage || 'not stated'}
Problem: ${ctx.startup.problem || 'not stated'}
Solution: ${ctx.startup.solution || 'not stated'}
Founder's stated reason for building it: ${ctx.startup.founder_vision || 'not stated'}

READINESS: ${ctx.score === null ? 'never assessed' : `${ctx.score} out of 100`}
Investors only see ventures at ${INVESTOR_BAR} or above. ${
    ctx.score === null ? 'This venture has not been assessed.'
      : ctx.visibleToInvestors ? 'This venture is above that bar.'
      : `This venture is ${ctx.pointsFromVisibility} points below it.`
  }
Dimension scores:
${dims}
${ctx.readiness?.critical_issues?.length ? `Critical issues: ${ctx.readiness.critical_issues.join('; ')}` : ''}

TEAM (${ctx.team.length}):
${ctx.team.length === 0 ? '  nobody on the team yet' : ctx.team.map(t => `  ${t.display_name} — ${t.role || 'member'}${t.is_founder ? ' (founder)' : ''}`).join('\n')}

OPEN ROLES (${ctx.openGaps.length}):
${ctx.openGaps.length === 0 ? '  none open' : ctx.openGaps.map(g => `  ${g.role} — ${g.priority_level} priority${g.seeking_type === 'CO_FOUNDER' ? ', co-founder search' : ''}. ${g.reason || ''}`).join('\n')}

RISKS (${ctx.risks.length}):
${ctx.risks.length === 0 ? '  none flagged' : ctx.risks.map(r => `  [${r.severity}] ${r.title}: ${r.description}${r.suggested_action ? ` — suggested: ${r.suggested_action}` : ''}`).join('\n')}

MILESTONES:
${ctx.milestones.length === 0 ? '  none planned' : ctx.milestones.map(m => `  ${m.sequence_order}. ${m.title} [${m.status}]`).join('\n')}`;
}

/**
 * Answer a question about this venture, or explain honestly why it cannot.
 */
async function askAboutVenture(startupId, userId, question) {
  if (!question || question.trim().length < 3) {
    return { success: false, error: 'EMPTY_QUESTION' };
  }

  const startupRes = await pool.query(`SELECT founder_id FROM startups WHERE id = $1`, [startupId]);
  if (startupRes.rows.length === 0) return { success: false, error: 'NOT_FOUND' };

  // Same ownership rule as everywhere else, co-founder fix included.
  let isOwner = startupRes.rows[0].founder_id === userId;
  if (!isOwner) {
    const co = await pool.query(
      `SELECT 1 FROM startup_team_members WHERE startup_id = $1 AND user_id = $2 AND is_founder = true`,
      [startupId, userId]
    );
    isOwner = co.rows.length > 0;
  }
  if (!isOwner) return { success: false, error: 'NOT_AUTHORIZED' };

  const ctx = await gatherContext(startupId);
  if (!ctx) return { success: false, error: 'NOT_FOUND' };

  // The fallback, assembled BEFORE the AI call so it exists whatever happens.
  const fallback = {
    score: ctx.score,
    visibleToInvestors: ctx.visibleToInvestors,
    pointsFromVisibility: ctx.pointsFromVisibility,
    openRoles: ctx.openGaps.map(g => g.role),
    criticalRisks: ctx.risks.filter(r => r.severity === 'CRITICAL').map(r => r.title),
    nextMilestone: ctx.milestones.find(m => m.status !== 'COMPLETED')?.title || null,
    teamSize: ctx.team.length,
  };

  const ai = await callGroq(GROQ_MODEL, [
    {
      role: 'system',
      content: `You answer a founder's questions about THEIR OWN venture, using only the data provided below.

ABSOLUTE RULES:
- Answer only from the provided data. If the answer is not in it, say plainly that you do not have that information and name what would be needed. Never fill a gap with a plausible guess.
- Never give generic startup advice. The founder can get that anywhere. Your only value is that you can see their actual numbers.
- Refer to real specifics: their actual score, their actual open roles, their actual risks, by name.
- Be direct and honest. If their readiness is low, say so. If a risk is serious, say so. Do not reassure.
- Plain prose. No markdown, no bullet points, no headings. 2 to 4 short paragraphs at most, usually fewer.
- If they ask something this data cannot answer, such as legal or tax advice or a valuation, say that plainly and suggest who could.`,
    },
    {
      role: 'user',
      content: `${renderContext(ctx)}

---
THE FOUNDER ASKS: ${question.trim()}`,
    },
  ], { temperature: 0.3, max_tokens: 800 });

  // GRACEFUL DEGRADATION. The AI failing must never leave the founder with
  // nothing: they still get the real figures they asked about, and a clear
  // statement that the explanation is unavailable rather than a silent
  // failure or a spinner that never resolves.
  if (!ai.success || !ai.content) {
    return {
      success: true,
      degraded: true,
      answer: null,
      facts: fallback,
      note: 'The assistant is unavailable right now, so here are your actual figures instead.',
    };
  }

  return { success: true, degraded: false, answer: ai.content.trim(), facts: fallback };
}

module.exports = { askAboutVenture, gatherContext, renderContext };
