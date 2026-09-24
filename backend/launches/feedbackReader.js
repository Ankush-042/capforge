/**
 * What the feedback actually says, read for the founder.
 *
 * NOT SENTIMENT. "72% positive" tells a founder nothing they can act on. What
 * helps is the pattern: three people got stuck at the same screen, two did not
 * understand what it was for, one would pay. So this clusters what people
 * wrote into themes and blockers, ranked by how many hit each one.
 *
 * PRIVATE TO THE FOUNDER. Testers wrote for them, not for an audience, and
 * publishing a machine's reading of somebody's honest criticism back to the
 * room would make the next person less honest.
 *
 * THE PAGE IS COMPLETE BEFORE THIS IS CALLED. The raw feedback renders on its
 * own; this appears above it when it appears at all. A rate limit, an outage,
 * a malformed response, none of them can produce an empty screen, because the
 * screen never depended on this in the first place. Same rule the venture
 * assistant and the email layer already follow.
 */
const pool = require('../shared/db');
const { callGroq } = require('../shared/aiClient');

const GROQ_MODEL = 'openai/gpt-oss-120b';
const MIN_TO_READ = 3;   // fewer than this and a founder should just read them

async function readFeedback(launchId, userId) {
  const l = await pool.query(
    `SELECT l.id, l.title, l.summary, l.state, l.questions, l.founder_id, s.name AS startup_name
     FROM launches l JOIN startups s ON s.id = l.startup_id WHERE l.id = $1`,
    [launchId]
  );
  if (l.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const launch = l.rows[0];
  if (launch.founder_id !== userId) return { success: false, error: 'NOT_YOURS' };

  const feedback = (await pool.query(
    `SELECT tried, would_use_again, what_happened, answers FROM launch_feedback
     WHERE launch_id = $1 ORDER BY created_at`,
    [launchId]
  )).rows;

  // Assembled BEFORE the model is called, so it exists whatever happens to it.
  const tried = feedback.filter((f) => f.tried);
  const facts = {
    responded: feedback.length,
    tried: tried.length,
    wouldUseAgain: tried.filter((f) => f.would_use_again === true).length,
    wouldNot: tried.filter((f) => f.would_use_again === false).length,
  };

  if (feedback.length < MIN_TO_READ) {
    return {
      success: true,
      tooEarly: true,
      facts,
      note: `Only ${feedback.length} ${feedback.length === 1 ? 'person has' : 'people have'} responded. Read them yourself; there is no pattern to find in ${feedback.length} yet.`,
    };
  }

  const rendered = feedback.map((f, i) => {
    const qa = (launch.questions || []).map((q, qi) =>
      f.answers && f.answers[qi] ? `    Q: ${q}\n    A: ${f.answers[qi]}` : null).filter(Boolean).join('\n');
    return `[${i + 1}] ${f.tried ? 'Tried it' : 'Did NOT try it'}${f.tried && f.would_use_again !== null ? `, would${f.would_use_again ? '' : ' NOT'} use again` : ''}
    ${f.what_happened}${qa ? `\n${qa}` : ''}`;
  }).join('\n\n');

  const ai = await callGroq(GROQ_MODEL, [
    {
      role: 'system',
      content: `You read product feedback for a founder and tell them what it actually says.

RULES:
- Find PATTERNS, not sentiment. A founder cannot act on "mostly positive". They can act on "four of nine got stuck at the same step".
- Every theme must say how many people it came from. If only one person said something, say so; do not present one opinion as a finding.
- Lead with what is blocking people, not with praise. Praise is pleasant and rarely actionable.
- Say the uncomfortable thing plainly. If people did not understand what the product is for, that is the finding, and softening it wastes their time.
- Quote a few words from real feedback where it is sharper than your paraphrase.
- Never invent a theme that is not in the text. If the feedback is thin or contradictory, say that instead.
- Plain prose, no markdown, no headings, no bullets. Three short paragraphs at most.`,
    },
    {
      role: 'user',
      content: `THE PRODUCT
${launch.startup_name}: ${launch.title}
${launch.summary}
Current state: ${launch.state}

WHAT ${feedback.length} PEOPLE SAID
${rendered}

Tell the founder what this feedback actually says: what is blocking people, how many hit each thing, and what they should look at first.`,
    },
  ], { temperature: 0.3, max_tokens: 700 });

  if (!ai.success || !ai.content) {
    return {
      success: true,
      degraded: true,
      reading: null,
      facts,
      note: 'The summary is unavailable right now. Every response is below, unchanged.',
    };
  }

  return { success: true, degraded: false, reading: ai.content.trim(), facts };
}

module.exports = { readFeedback };
