/**
 * The founder asks about their own launch instead of reading all of it.
 *
 * Forty messages under a launch is a job, not a gift. A founder wants one
 * thing at a time: what is the main complaint, did anyone mention pricing, is
 * the problem the signup or the landing page, is anybody saying they would
 * pay. The assistant has read every message and answers from it.
 *
 * That is the whole reason to collect a discussion rather than a form. A form
 * gives you a spreadsheet you still have to interpret; a room plus something
 * that has read the room gives you the answer.
 *
 * PRIVATE TO THE FOUNDER. People wrote in the open, but a machine's reading
 * of somebody's criticism, handed back to the room, would make the next
 * person less honest.
 *
 * ANSWERS ONLY FROM WHAT WAS SAID. If nobody mentioned pricing, the answer is
 * that nobody mentioned pricing, not a plausible guess about what they might
 * think. A confident invention here is worse than no assistant at all,
 * because the founder would act on it.
 *
 * AND THE PAGE NEVER WAITS FOR THIS. The discussion renders on its own; this
 * is asked for. A rate limit costs an answer, never the room.
 */
const pool = require('../shared/db');
const { callGroq } = require('../shared/aiClient');

const GROQ_MODEL = 'openai/gpt-oss-120b';

async function askAboutLaunch(launchId, userId, question) {
  if (!question || question.trim().length < 3) return { success: false, error: 'EMPTY_QUESTION' };

  const l = await pool.query(
    `SELECT l.id, l.title, l.summary, l.state, l.asking_about, l.founder_id, s.name AS startup_name
     FROM launches l JOIN startups s ON s.id = l.startup_id WHERE l.id = $1`,
    [launchId]
  );
  if (l.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const launch = l.rows[0];
  if (launch.founder_id !== userId) return { success: false, error: 'NOT_YOURS' };

  const comments = (await pool.query(
    `SELECT c.body, c.tried_it, c.parent_id, c.created_at,
            p.display_name, p.headline
     FROM launch_comments c
     JOIN profiles p ON p.user_id = c.author_id
     WHERE c.launch_id = $1
     ORDER BY c.created_at ASC`,
    [launchId]
  )).rows;

  // Assembled BEFORE the model is called, so it survives whatever happens to
  // it. These are counts of real rows, never estimates.
  const speakers = new Set();
  const tried = new Set();
  for (const c of comments) {
    speakers.add(c.display_name);
    if (c.tried_it) tried.add(c.display_name);
  }
  const facts = { comments: comments.length, people: speakers.size, tried: tried.size };

  if (comments.length === 0) {
    return { success: true, empty: true, facts, note: 'Nobody has said anything yet, so there is nothing to read.' };
  }

  const rendered = comments.map((c, i) => {
    const who = `${c.display_name}${c.headline ? ` (${c.headline})` : ''}`;
    const flag = c.tried_it === true ? ' [opened it]' : c.tried_it === false ? ' [did not open it]' : '';
    return `[${i + 1}]${c.parent_id ? ' (reply)' : ''} ${who}${flag}: ${c.body}`;
  }).join('\n\n');

  const ai = await callGroq(GROQ_MODEL, [
    {
      role: 'system',
      content: `You answer a founder's questions about the discussion under their own launch, using only what people actually wrote.

ABSOLUTE RULES:
- Answer only from the discussion below. If nobody raised the thing being asked about, say that plainly. Never supply a plausible answer the text does not support: the founder will act on it.
- Count things. "Three of the seven people who opened it said the same thing" beats "several people mentioned". Numbers are checkable, impressions are not.
- Quote a few words where somebody's own phrasing is sharper than a paraphrase.
- Note when somebody did NOT open it. A reaction to the description is not a reaction to the product, and treating them the same misleads.
- Lead with what is blocking people. Praise is pleasant and rarely actionable.
- Say the uncomfortable thing. If people did not understand what this is for, that is the finding, and softening it wastes their time.
- ANSWER THE QUESTION ASKED. Do not summarise everything unless that is what was asked.
- Plain prose. No markdown, no bullets, no headings. Three short paragraphs at most.`,
    },
    {
      role: 'user',
      content: `THE QUESTION: ${question.trim()}

--- THE LAUNCH ---
${launch.startup_name}: ${launch.title}
${launch.summary}
State: ${launch.state}${launch.asking_about ? `\nThe founder asked people to focus on: ${launch.asking_about}` : ''}

--- THE DISCUSSION, ${comments.length} message(s) from ${speakers.size} people ---
${rendered}
--- END ---

Now answer only this: ${question.trim()}`,
    },
  ], { temperature: 0.2, max_tokens: 800 });

  if (!ai.success || !ai.content) {
    return {
      success: true,
      degraded: true,
      answer: null,
      facts,
      note: 'The assistant is unavailable right now. The discussion is all there, unchanged.',
    };
  }

  return { success: true, degraded: false, answer: ai.content.trim(), facts };
}

/** What a founder is most likely to want, so they are not staring at a box. */
const SUGGESTED = [
  'What is the main thing stopping people?',
  'Did anyone say they would pay for this?',
  'What did the people who actually opened it say, as opposed to the rest?',
  'Is there anything more than one person raised?',
];

module.exports = { askAboutLaunch, SUGGESTED };
