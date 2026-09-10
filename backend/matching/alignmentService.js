/**
 * Real alignment scoring, judged by an LLM rather than by cosine similarity.
 *
 * Replaces the embedding approach for this specific signal, because
 * embeddings were proven unable to carry it: they cannot represent negation,
 * so "I have spent three years making dashboards load faster and I am done
 * with that" scored HIGHEST against a marketing-dashboard venture.
 *
 * Design constraints this respects:
 *   - Never load-bearing. A missing score means "no alignment signal", and
 *     matching falls back to the deterministic signals that carry 81% of the
 *     weight and are already correct. It never means a broken match.
 *   - Cached per pair, keyed on hashes of the exact text scored. Editing a
 *     mission invalidates only that person's rows.
 *   - Resumable. Every score is written the moment it is computed, so
 *     hitting a rate limit loses nothing already done.
 */
const crypto = require('crypto');
const pool = require('../shared/db');
const { callGroq } = require('../shared/aiClient');

const GROQ_MODEL = 'openai/gpt-oss-120b';

function hash(text) {
  return crypto.createHash('sha256').update((text || '').trim()).digest('hex').slice(0, 16);
}

/**
 * Score ONE contributor against ALL ventures in a single call.
 *
 * The first version made one call per pair: 528 calls, and with a reasoning
 * model at 2s throttle that is genuinely unreasonable. It also used
 * max_tokens 200, which truncated the JSON mid-sentence on nearly every
 * response, so most "failures" were my token limit rather than any rate
 * limit. Retrying a deterministic truncation just burned 65 seconds
 * reproducing it.
 *
 * One call per contributor is 38 calls instead of 528, and gives the model
 * the full set to compare against, which produces better relative scoring
 * than judging each venture in isolation.
 */
async function scoreContributorAgainstVentures({ userId, mission, headline, domains, ventures }) {
  const mHash = hash(mission);

  const ventureList = ventures.map((v, i) =>
    `[${i}] ${v.name}
    Field: ${(v.domain || []).join(', ') || 'not stated'}
    Building: ${(v.problem || 'not stated').slice(0, 300)}
    Founder's reason: ${(v.founder_vision || '').slice(0, 500)}`
  ).join('\n\n');

  const ai = await callGroq(GROQ_MODEL, [
    {
      role: 'system',
      content: `You judge how well one person's stated motivation aligns with each of several ventures.

Read carefully. What the person says they do NOT want matters as much as what they do want. Someone who says they are done with a kind of work must score LOW against ventures doing that work, however similar the vocabulary looks.

Return ONLY a valid JSON array, one object per venture, in the same order, no other text:
[{"i": 0, "score": 7, "reason": "one sentence"}, ...]

score is 0-10:
  9-10  their stated motivation is almost exactly this venture's purpose
  7-8   strong genuine overlap
  5-6   some real common ground, not central
  3-4   weak, mostly unrelated
  0-2   no alignment, or they explicitly said they do not want this

reason: one plain sentence referring to something they actually wrote. Never flatter. If alignment is weak, say why plainly. Keep each reason under 25 words.`,
    },
    {
      role: 'user',
      content: `THE PERSON
Role: ${headline || 'not stated'}
Interested in: ${(domains || []).join(', ') || 'not stated'}
What they are looking for:
"${mission}"

THE VENTURES (${ventures.length})
${ventureList}

Return the JSON array now, ${ventures.length} objects.`,
    },
  ], { temperature: 0.1, max_tokens: 4000 });

  if (!ai.success) return { failed: true, reason: ai.error || 'AI_CALL_FAILED', detail: ai.detail };

  let parsed;
  try {
    const cleaned = ai.content.replace(/```json|```/g, '').trim();
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket === -1 || lastBracket === -1) throw new Error('no array found');
    parsed = JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
  } catch (err) {
    return { failed: true, reason: 'UNPARSEABLE', detail: (ai.content || '').slice(0, 200) };
  }
  if (!Array.isArray(parsed)) return { failed: true, reason: 'NOT_AN_ARRAY' };

  const saved = [];
  for (const item of parsed) {
    const idx = typeof item.i === 'number' ? item.i : -1;
    const venture = ventures[idx];
    if (!venture || typeof item.score !== 'number' || !item.reason) continue;

    const normalized = Math.max(0, Math.min(1, item.score / 10));
    await pool.query(
      `INSERT INTO alignment_scores (user_id, startup_id, score, reason, mission_hash, vision_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, startup_id) DO UPDATE
         SET score = EXCLUDED.score, reason = EXCLUDED.reason,
             mission_hash = EXCLUDED.mission_hash, vision_hash = EXCLUDED.vision_hash,
             scored_at = now()`,
      [userId, venture.id, normalized, item.reason, mHash, hash(venture.founder_vision)]
    );
    saved.push({ startup: venture.name, score: normalized, reason: item.reason });
  }

  return { saved, expected: ventures.length };
}

/**
 * Bulk lookup used by the matching engine. Reads cache only, never calls the
 * LLM, so ranking stays fast and cannot be rate limited.
 */
async function getAlignmentScores(startupId, userIds) {
  if (!userIds || userIds.length === 0) return {};
  const result = await pool.query(
    `SELECT user_id, score, reason FROM alignment_scores
     WHERE startup_id = $1 AND user_id = ANY($2::uuid[])`,
    [startupId, userIds]
  );
  const map = {};
  for (const r of result.rows) {
    map[r.user_id] = { score: parseFloat(r.score), reason: r.reason };
  }
  return map;
}

/** Invalidate one person's scores when they rewrite their mission. */
async function invalidateForUser(userId) {
  await pool.query(`DELETE FROM alignment_scores WHERE user_id = $1`, [userId]);
}

/** Invalidate one venture's scores when its vision changes. */
async function invalidateForStartup(startupId) {
  await pool.query(`DELETE FROM alignment_scores WHERE startup_id = $1`, [startupId]);
}

module.exports = { scoreContributorAgainstVentures, getAlignmentScores, invalidateForUser, invalidateForStartup };
