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

  // REAL BUG CAUGHT IN OUTPUT: one contributor came back "14/15 scored" and
  // the top result showed 90% NeuraHealth with a reason that talked about
  // SecureLayer. The model returned shifted indices and this code trusted
  // them, silently attaching every reason to the wrong venture.
  //
  // A partial or misindexed batch is not partially usable, it is wrong. If
  // the response does not contain exactly one valid entry per venture, the
  // whole batch is rejected and retried rather than saving mismatched data.
  const seen = new Set();
  for (const item of parsed) {
    const idx = typeof item.i === 'number' ? item.i : -1;
    if (idx < 0 || idx >= ventures.length) {
      return { failed: true, reason: 'BAD_INDEX', detail: `index ${idx} outside 0..${ventures.length - 1}` };
    }
    if (seen.has(idx)) {
      return { failed: true, reason: 'DUPLICATE_INDEX', detail: `index ${idx} returned twice` };
    }
    seen.add(idx);
  }
  if (seen.size !== ventures.length) {
    return { failed: true, reason: 'INCOMPLETE_BATCH', detail: `got ${seen.size} of ${ventures.length} ventures` };
  }

  const saved = [];
  for (const item of parsed) {
    const venture = ventures[item.i];
    if (!venture || typeof item.score !== 'number' || !item.reason) {
      return { failed: true, reason: 'MALFORMED_ENTRY', detail: JSON.stringify(item).slice(0, 120) };
    }

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
 * Score ONE investor's thesis against ALL ventures in a single call.
 *
 * The investor side had no alignment layer at all. Their thesis, the
 * paragraph explaining what they actually back and what they pass on, was
 * collected at onboarding, shown on their profile, and used for nothing.
 * Deal flow ranked purely on domain, stage, readiness and risk, so an
 * investor who wrote "I back technical founders in regulated markets and
 * pass on consumer social" got no credit for any of that nuance.
 *
 * Same machinery as the contributor side, which is deliberate: one batched
 * call, cached per pair, capped, and explicitly told that what someone says
 * they PASS ON matters as much as what they look for. Embeddings cannot
 * represent that, which is why this is an LLM judgement.
 *
 * Reuses the same alignment_scores table. An investor is a user, so the
 * (user_id, startup_id) key works unchanged.
 */
async function scoreInvestorAgainstVentures({ userId, thesis, domains, stages, ventures }) {
  const tHash = hash(thesis);

  const ventureList = ventures.map((v, i) =>
    `[${i}] ${v.name}
    Field: ${(v.domain || []).join(', ') || 'not stated'}
    Stage: ${v.stage || 'not stated'}
    Problem: ${(v.problem || 'not stated').slice(0, 300)}
    Founder's reason for building it: ${(v.founder_vision || '').slice(0, 500)}`
  ).join('\n\n');

  const ai = await callGroq(GROQ_MODEL, [
    {
      role: 'system',
      content: `You judge how well each venture fits an investor's stated thesis.

Read the thesis carefully. What an investor says they PASS ON matters as much as what they look for. A venture matching something they explicitly rule out must score LOW, however strong it looks on paper.

Judge the thesis itself, not the obvious surface facts. Domain and stage are already scored separately, so do not simply reward a domain match. Look for what the thesis actually says about the kind of founder, problem, or approach they back.

Return ONLY a valid JSON array, one object per venture, in the same order, no other text:
[{"i": 0, "score": 7, "reason": "one sentence"}, ...]

score is 0-10:
  9-10  squarely what this thesis describes
  7-8   strong genuine fit with the thesis
  5-6   plausible, not clearly what they are after
  3-4   weak, mostly outside the thesis
  0-2   outside it, or something they said they pass on

reason: one plain sentence referring to something actually in the thesis. Never flatter. If the fit is weak, say why plainly. Under 25 words.`,
    },
    {
      role: 'user',
      content: `THE INVESTOR
Fields they invest in: ${(domains || []).join(', ') || 'not stated'}
Stages they come in at: ${(stages || []).join(', ') || 'not stated'}
Their thesis, in their own words:
"${thesis}"

THE VENTURES (${ventures.length})
${ventureList}

Return the JSON array now, ${ventures.length} objects.`,
    },
  ], { temperature: 0.1, max_tokens: 4000 });

  if (!ai.success) return { failed: true, reason: ai.error || 'AI_CALL_FAILED', detail: ai.detail };

  let parsed;
  try {
    const cleaned = ai.content.replace(/```json|```/g, '').trim();
    const a = cleaned.indexOf('[');
    const b = cleaned.lastIndexOf(']');
    if (a === -1 || b === -1) throw new Error('no array found');
    parsed = JSON.parse(cleaned.slice(a, b + 1));
  } catch {
    return { failed: true, reason: 'UNPARSEABLE', detail: (ai.content || '').slice(0, 200) };
  }
  if (!Array.isArray(parsed)) return { failed: true, reason: 'NOT_AN_ARRAY' };

  // Same index validation as the contributor path. A shifted index silently
  // attached every reason to the wrong venture there, which read as success.
  const seen = new Set();
  for (const item of parsed) {
    const idx = typeof item.i === 'number' ? item.i : -1;
    if (idx < 0 || idx >= ventures.length) {
      return { failed: true, reason: 'BAD_INDEX', detail: `index ${idx} outside 0..${ventures.length - 1}` };
    }
    if (seen.has(idx)) return { failed: true, reason: 'DUPLICATE_INDEX', detail: `index ${idx} twice` };
    seen.add(idx);
  }
  if (seen.size !== ventures.length) {
    return { failed: true, reason: 'INCOMPLETE_BATCH', detail: `got ${seen.size} of ${ventures.length}` };
  }

  const saved = [];
  for (const item of parsed) {
    const venture = ventures[item.i];
    if (!venture || typeof item.score !== 'number' || !item.reason) {
      return { failed: true, reason: 'MALFORMED_ENTRY', detail: JSON.stringify(item).slice(0, 120) };
    }
    const normalized = Math.max(0, Math.min(1, item.score / 10));
    await pool.query(
      `INSERT INTO alignment_scores (user_id, startup_id, score, reason, mission_hash, vision_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, startup_id) DO UPDATE
         SET score = EXCLUDED.score, reason = EXCLUDED.reason,
             mission_hash = EXCLUDED.mission_hash, vision_hash = EXCLUDED.vision_hash,
             scored_at = now()`,
      [userId, venture.id, normalized, item.reason, tHash, hash(venture.founder_vision)]
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

module.exports = { scoreContributorAgainstVentures, scoreInvestorAgainstVentures, getAlignmentScores, invalidateForUser, invalidateForStartup };
