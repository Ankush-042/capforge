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
 * Score one pair. Returns null on any failure rather than throwing, because
 * this signal must never be able to break a match.
 */
async function scorePair({ userId, startupId, mission, vision, problem, ventureDomains, domains, headline }) {
  const mHash = hash(mission);
  const vHash = hash(vision);

  const existing = await pool.query(
    `SELECT score, reason FROM alignment_scores
     WHERE user_id = $1 AND startup_id = $2 AND mission_hash = $3 AND vision_hash = $4`,
    [userId, startupId, mHash, vHash]
  );
  if (existing.rows.length > 0) {
    return { score: parseFloat(existing.rows[0].score), reason: existing.rows[0].reason, cached: true };
  }

  const ai = await callGroq(GROQ_MODEL, [
    {
      role: 'system',
      content: `You judge whether a person's stated motivation genuinely aligns with what a specific venture is building.

Read carefully. Pay attention to what the person says they DO NOT want, which matters as much as what they do want. Someone who says they are done with a kind of work should score LOW against a venture doing that work, however similar the words look.

Return ONLY valid JSON: {"score": <0-10 integer>, "reason": "<one sentence>"}

Scoring guide:
  9-10  Their stated motivation is almost exactly this venture's purpose.
  7-8   Strong genuine overlap in what they care about.
  5-6   Some real common ground, not central.
  3-4   Weak connection, mostly unrelated.
  0-2   No real alignment, or they explicitly said they do not want this.

The reason must be one plain sentence a person would find fair, referring to something they actually wrote. Never flatter. If the alignment is weak, say why plainly.`,
    },
    {
      role: 'user',
      content: `THE PERSON
Role: ${headline || 'not stated'}
Fields they are interested in: ${(domains || []).join(', ') || 'not stated'}
What they say they are looking for:
"${mission}"

THE VENTURE
Field: ${(ventureDomains || []).join(', ') || 'not stated'}
What they are building: ${problem || 'not stated'}
The founder's stated reason for building it:
"${vision}"`,
    },
  ], { temperature: 0.1, max_tokens: 200 });

  if (!ai.success) return null;

  let parsed;
  try {
    parsed = JSON.parse(ai.content.replace(/```json|```/g, '').trim());
  } catch {
    return null;
  }
  if (typeof parsed.score !== 'number' || !parsed.reason) return null;

  const normalized = Math.max(0, Math.min(1, parsed.score / 10));

  await pool.query(
    `INSERT INTO alignment_scores (user_id, startup_id, score, reason, mission_hash, vision_hash)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, startup_id) DO UPDATE
       SET score = EXCLUDED.score, reason = EXCLUDED.reason,
           mission_hash = EXCLUDED.mission_hash, vision_hash = EXCLUDED.vision_hash,
           scored_at = now()`,
    [userId, startupId, normalized, parsed.reason, mHash, vHash]
  );

  return { score: normalized, reason: parsed.reason, cached: false };
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

module.exports = { scorePair, getAlignmentScores, invalidateForUser, invalidateForStartup };
