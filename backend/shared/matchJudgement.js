/**
 * The engine's judgement layer.
 *
 * THE PROBLEM THIS REPLACES. Every deterministic component is a hand-written
 * string rule: literal skill-token overlap, a table of job titles, a table of
 * domain equivalences. Each breaks when somebody writes something the table
 * did not anticipate, which is every real person. Three separate fixes to role
 * matching in one day is not three bugs, it is one approach reaching its
 * ceiling.
 *
 * The seeded profiles all pass because they were written to match the tables.
 * That makes the quality suite circular: it stayed green while a real signup
 * scored zero against all 62 roles.
 *
 * WHAT THIS DOES INSTEAD. One call per person, judging them against every open
 * role at once, reading the whole profile against the whole role: what they
 * say they do, what they say they want, what the role needs, what the venture
 * is actually building. No tables to maintain and nothing to anticipate.
 *
 * WHAT IT DOES NOT DO. It does not replace the deterministic score. The
 * capability ceiling, the evidence rule and the weights all still apply. This
 * is a strong additional signal, and when it is absent for any reason the
 * engine behaves exactly as it does today. Better with it, never broken
 * without it.
 */
const crypto = require('crypto');
const pool = require('./db');
const { callGroq } = require('./aiClient');

const GROQ_MODEL = 'openai/gpt-oss-120b';

const hash = (t) => crypto.createHash('sha256').update(String(t || '')).digest('hex').slice(0, 16);

/** What the judgement was made from. Change either side and it is stale. */
function profileFingerprint(p) {
  return hash([
    p.headline, (p.skills || []).join(','), p.bio,
    p.looking_for, (p.preferred_domains || []).join(','), (p.preferred_stage || []).join(','),
    p.experience_years, p.availability,
  ].join('|'));
}

function gapFingerprint(g) {
  return hash([
    g.role, (g.required_skills || []).join(','), g.reason, g.seeking_type,
    g.startup_name, g.problem, g.solution, (g.domain || []).join(','), g.stage,
  ].join('|'));
}

/**
 * Judge one person against many roles in a single call.
 *
 * Batched for the same reason alignment scoring is: per-pair would be hundreds
 * of calls, and a model that sees the whole set produces better relative
 * judgements than one judging each role blind.
 */
async function judgeCandidateAgainstGaps(profile, gaps) {
  if (!gaps.length) return { judged: [] };

  const roleList = gaps.map((g, i) => `[${i}] ${g.role}${g.seeking_type === 'CO_FOUNDER' ? ' (co-founder)' : ''} at ${g.startup_name}
    Needs: ${(g.required_skills || []).join(', ') || 'not specified'}
    Why the role exists: ${(g.reason || '').slice(0, 200)}
    The venture: ${(g.problem || '').slice(0, 200)}
    Field: ${(g.domain || []).join(', ') || 'not stated'} | Stage: ${g.stage || 'not stated'}`).join('\n\n');

  const ai = await callGroq(GROQ_MODEL, [
    {
      role: 'system',
      content: `You judge whether a person is a good match for open roles at early-stage ventures.

Two questions, both mattering:
  CAN THEY DO IT — does their actual background cover what this role needs? Judge the substance, not the wording. Someone describing themselves as "AI/ML Engineering" can do a "Machine Learning Engineer" role. Someone listing "python" can plausibly do "adaptive algorithms" if their background is ML. Do not require their words to literally appear in the role's requirements.
  WOULD THEY WANT IT — they wrote what they are looking for. Take it seriously. Someone who says they want to work on education should not be told a logistics venture is a strong match, however capable they are.

Return ONLY a valid JSON array, one object per role, same order, no other text:
[{"i": 0, "score": 7, "reason": "one sentence"}, ...]

score 0-10:
  9-10  they can clearly do this AND it is the kind of work they said they want
  7-8   strong on both, or excellent on capability with no conflict on wanting it
  5-6   could do it, but it is not what they said they are looking for
  3-4   a stretch on capability, or squarely outside what they want
  0-2   cannot do this job, or the opposite of what they asked for

reason: one plain sentence naming something real from their profile against something real in the role. Never flatter. If it is a weak match, say why plainly. Under 25 words.`,
    },
    {
      role: 'user',
      content: `THE PERSON
What they do: ${profile.headline || 'not stated'}
Skills they listed: ${(profile.skills || []).join(', ') || 'none listed'}
About them: ${(profile.bio || 'not stated').slice(0, 300)}
Years doing this work: ${profile.experience_years ?? 'not stated'}
Time they can give: ${profile.availability || 'not stated'}
Fields they care about: ${(profile.preferred_domains || []).join(', ') || 'none picked'}
Stages they want: ${(profile.preferred_stage || []).join(', ') || 'unspecified'}
WHAT THEY SAID THEY WANT: ${profile.looking_for || 'they have not said'}

THE ROLES (${gaps.length})
${roleList}

Return the JSON array now, ${gaps.length} objects.`,
    },
  ], { temperature: 0.1, max_tokens: 4000 });

  if (!ai.success) return { failed: true, reason: ai.error || 'AI_CALL_FAILED', detail: ai.detail };

  let parsed;
  try {
    const cleaned = ai.content.replace(/```json|```/g, '').trim();
    const a = cleaned.indexOf('[');
    const b = cleaned.lastIndexOf(']');
    if (a === -1 || b === -1) throw new Error('no array');
    parsed = JSON.parse(cleaned.slice(a, b + 1));
  } catch {
    return { failed: true, reason: 'UNPARSEABLE', detail: (ai.content || '').slice(0, 200) };
  }
  if (!Array.isArray(parsed)) return { failed: true, reason: 'NOT_AN_ARRAY' };

  // Index validation, the same guard the alignment layer needed. A shifted
  // index silently attaches every reason to the wrong role and reads as
  // success, which is the worst possible failure for something people read.
  const seen = new Set();
  for (const item of parsed) {
    const idx = typeof item.i === 'number' ? item.i : -1;
    if (idx < 0 || idx >= gaps.length) return { failed: true, reason: 'BAD_INDEX', detail: `${idx} outside 0..${gaps.length - 1}` };
    if (seen.has(idx)) return { failed: true, reason: 'DUPLICATE_INDEX', detail: `${idx} twice` };
    seen.add(idx);
  }
  if (seen.size !== gaps.length) return { failed: true, reason: 'INCOMPLETE', detail: `${seen.size} of ${gaps.length}` };

  const pHash = profileFingerprint(profile);
  const judged = [];

  for (const item of parsed) {
    const g = gaps[item.i];
    if (!g || typeof item.score !== 'number' || !item.reason) {
      return { failed: true, reason: 'MALFORMED_ENTRY', detail: JSON.stringify(item).slice(0, 120) };
    }
    const score = Math.max(0, Math.min(1, item.score / 10));
    await pool.query(
      `INSERT INTO match_judgements (user_id, gap_id, score, reason, profile_hash, gap_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, gap_id) DO UPDATE
         SET score = EXCLUDED.score, reason = EXCLUDED.reason,
             profile_hash = EXCLUDED.profile_hash, gap_hash = EXCLUDED.gap_hash,
             judged_at = now()`,
      [profile.user_id, g.id, score, item.reason, pHash, gapFingerprint(g)]
    );
    judged.push({ gapId: g.id, role: g.role, startup: g.startup_name, score, reason: item.reason });
  }

  return { judged };
}

/**
 * Cached judgements for one person, only where still valid.
 *
 * A stale judgement is worse than none: it describes a profile or a role that
 * no longer exists. Read-only and cheap, so ranking never calls the model and
 * a rate limit can never slow or break it.
 */
async function getJudgements(userId, gaps) {
  if (!gaps.length) return {};
  const rows = await pool.query(
    `SELECT gap_id, score, reason, profile_hash, gap_hash
     FROM match_judgements WHERE user_id = $1 AND gap_id = ANY($2::uuid[])`,
    [userId, gaps.map((g) => g.id)]
  );

  const byGap = {};
  const gapById = Object.fromEntries(gaps.map((g) => [g.id, g]));
  for (const r of rows.rows) {
    const g = gapById[r.gap_id];
    if (!g) continue;
    if (r.gap_hash !== gapFingerprint(g)) continue; // the role changed
    byGap[r.gap_id] = { score: parseFloat(r.score), reason: r.reason, profileHash: r.profile_hash };
  }
  return byGap;
}

module.exports = {
  judgeCandidateAgainstGaps,
  getJudgements,
  profileFingerprint,
  gapFingerprint,
};
