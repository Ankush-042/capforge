/**
 * AI-06/AI-07 — Candidate Retrieval + Ranking Engine.
 * Ref: AI/Intelligence spec §18-23, architecture doc §55-60, TRD §21-25.
 *
 * NON-NEGOTIABLE (architecture doc §106 Rule 4, AI spec §63):
 * Ranking is deterministic and rule-based, NOT LLM-generated. The LLM has
 * no role in this file at all. This is what makes CapForge's matching
 * reproducible, debuggable, and honestly explainable — the explanation
 * text is generated FROM the actual component scores below, never
 * invented separately.
 */
const pool = require('../shared/db');
const { normalizeRole } = require('../gaps/gapDiagnosisService');

/**
 * Weights are now a FUNCTION of seeking_type, not a static constant.
 * This is the real fix for direct feedback that matching felt like a
 * generic job board: a CO_FOUNDER search must weigh compatibility far
 * more heavily than a CONTRACTOR search, where skill fit alone should
 * dominate. Each set is verified to sum to 1.0 (tested before shipping).
 */
function getWeights(seekingType) {
  switch (seekingType) {
    case 'CO_FOUNDER':
      return { skillFit: 0.25, roleFit: 0.15, domainFit: 0.10, stageFit: 0.10, experienceFit: 0.10, availabilityFit: 0.05, compatibilityFit: 0.25 };
    case 'CONTRACTOR':
      return { skillFit: 0.50, roleFit: 0.20, domainFit: 0.10, stageFit: 0.05, experienceFit: 0.10, availabilityFit: 0.03, compatibilityFit: 0.02 };
    case 'ADVISOR':
      return { skillFit: 0.35, roleFit: 0.15, domainFit: 0.15, stageFit: 0.05, experienceFit: 0.20, availabilityFit: 0.02, compatibilityFit: 0.08 };
    default: // CORE_HIRE
      return { skillFit: 0.38, roleFit: 0.20, domainFit: 0.14, stageFit: 0.09, experienceFit: 0.09, availabilityFit: 0.05, compatibilityFit: 0.05 };
  }
}

/**
 * Pure scoring function — one candidate against one gap. Independently
 * testable (TRD §92), no DB or network access.
 *
 * @param {{role: string, required_skills: string[]}} gap
 * @param {object} startup - needs .domain, .stage
 * @param {object} candidate - { headline, skills, preferred_domains, preferred_stage, experience_years, availability }
 */
function scoreCandidate(gap, startup, candidate, feedbackAdjustment = 0) {
  const requiredSkills = (gap.required_skills || []).map(s => s.toLowerCase().trim());
  const candidateSkills = new Set((candidate.skills || []).map(s => s.toLowerCase().trim()));

  // --- Skill fit: blend of deterministic skill-string overlap AND real
  // semantic (vector embedding) similarity — this is the actual fix for
  // Objective 2's claim that matching is "driven by semantic retrieval /
  // vector similarity," which the deterministic-only version never was.
  // Falls back cleanly to pure deterministic scoring when either side
  // lacks an embedding yet (candidate.semantic_similarity is null),
  // rather than treating a missing embedding as zero similarity.
  const overlap = requiredSkills.filter(s => candidateSkills.has(s));
  const deterministicSkillFit = requiredSkills.length > 0 ? overlap.length / requiredSkills.length : 0;
  const hasSemanticSignal = candidate.semantic_similarity !== null && candidate.semantic_similarity !== undefined;
  const skillFit = hasSemanticSignal
    ? (deterministicSkillFit * 0.5) + (candidate.semantic_similarity * 0.5)
    : deterministicSkillFit;

  // --- Role fit: does the candidate's stated headline match the gap's role? ---
  const roleFit = (candidate.headline && normalizeRole(candidate.headline) === normalizeRole(gap.role)) ? 1.0 : 0.0;

  // --- Domain fit: overlap of candidate's preferred domains with the startup's domain ---
  const startupDomains = new Set((startup.domain || []).map(d => d.toLowerCase().trim()));
  const candidateDomains = (candidate.preferred_domains || []).map(d => d.toLowerCase().trim());
  const domainOverlap = candidateDomains.filter(d => startupDomains.has(d));
  const domainFit = startupDomains.size > 0
    ? Math.min(domainOverlap.length / startupDomains.size, 1)
    : 0.5; // neutral if startup has no domain info to compare against

  // --- Stage fit: does the candidate's preferred stage include this startup's stage? ---
  const preferredStages = (candidate.preferred_stage || []).map(s => s.toLowerCase().trim());
  let stageFit;
  if (preferredStages.length === 0) {
    stageFit = 0.5; // no stated preference — neutral, not penalized
  } else {
    stageFit = preferredStages.includes((startup.stage || '').toLowerCase()) ? 1.0 : 0.0;
  }

  // --- Experience fit: v1 heuristic, linear up to 5 years (documented approximation) ---
  const experienceFit = Math.min((candidate.experience_years || 0) / 5, 1);

  // --- Availability fit: v1 — presence signal only, no startup-side requirement yet ---
  const availabilityFit = candidate.availability ? 0.7 : 0.3;

  // --- Compatibility fit: REAL signal, not cosmetic — this is the direct
  // fix for feedback that matching felt like a generic job board. For a
  // CO_FOUNDER search specifically, commitment depth and equity-mindedness
  // (stated equity_preference — a genuine "I'm here for ownership, not
  // just pay" signal) matter far more than for a contractor gig. Built
  // from data that actually exists (commitment_type, equity_preference),
  // never fabricated.
  const seekingType = gap.seeking_type || 'CORE_HIRE';
  let compatibilityFit;
  if (seekingType === 'CO_FOUNDER') {
    const commitmentScore = candidate.availability === 'full-time' ? 1.0 : candidate.availability === 'part-time' ? 0.4 : 0.1;
    const equityMindedness = candidate.equity_preference ? 1.0 : 0.3;
    compatibilityFit = (commitmentScore * 0.6) + (equityMindedness * 0.4);
  } else if (seekingType === 'CONTRACTOR') {
    compatibilityFit = 0.7; // commitment depth barely matters for a defined-scope engagement
  } else {
    compatibilityFit = candidate.availability === 'full-time' ? 0.8 : candidate.availability === 'part-time' ? 0.6 : 0.4;
  }

  const breakdown = { skillFit, roleFit, domainFit, stageFit, experienceFit, availabilityFit, compatibilityFit, semanticSimilarity: hasSemanticSignal ? candidate.semantic_similarity : null };

  const weights = getWeights(seekingType);
  const baseScore = Object.keys(weights).reduce(
    (sum, key) => sum + breakdown[key] * weights[key], 0
  );

  // AI spec §50-52: feedback nudges the score, bounded, never overrides
  // the underlying requirement fit entirely.
  const finalScore = Math.max(Math.min(baseScore + feedbackAdjustment, 1), 0);
  breakdown.feedbackAdjustment = feedbackAdjustment;

  return { score: Math.round(finalScore * 100) / 100, breakdown, overlap, domainOverlap, seekingType };
}

/**
 * Converts raw component scores into human-readable, evidence-based
 * explanation text. Never invents a reason not present in `breakdown`
 * (AI spec §64, architecture doc §59).
 */
function explainScore(gap, breakdown, overlap, domainOverlap) {
  const strengths = [];
  const limitations = [];

  if (breakdown.skillFit >= 0.6) {
    strengths.push(`Strong skill match for "${gap.role}" — covers ${overlap.join(', ')}.`);
  } else if (breakdown.skillFit > 0) {
    strengths.push(`Partial skill overlap: ${overlap.join(', ')}.`);
  } else {
    limitations.push(`No overlapping skills found for the specific requirements of "${gap.role}".`);
  }

  if (breakdown.roleFit === 1.0) {
    strengths.push(`Profile headline directly matches the "${gap.role}" role.`);
  }

  if (breakdown.domainFit >= 0.6) {
    strengths.push(`Domain preference aligns with this venture (${domainOverlap.join(', ')}).`);
  } else if (breakdown.domainFit < 0.3 && domainOverlap.length === 0) {
    limitations.push('No stated domain preference overlaps with this venture.');
  }

  if (breakdown.stageFit === 1.0) {
    strengths.push('Prefers working with startups at this exact stage.');
  } else if (breakdown.stageFit === 0.0) {
    limitations.push('Stated stage preference does not include this venture\'s current stage.');
  }

  if (breakdown.experienceFit >= 0.6) {
    strengths.push('Has meaningful relevant experience.');
  }

  if (breakdown.availabilityFit < 0.5) {
    limitations.push('Availability is not clearly stated on their profile.');
  }

  if (gap.seeking_type === 'CO_FOUNDER') {
    if (breakdown.compatibilityFit >= 0.7) {
      strengths.push('Commitment level and equity-mindedness align well with a co-founder role.');
    } else if (breakdown.compatibilityFit < 0.4) {
      limitations.push('Stated availability or equity preference suggests limited alignment with a co-founder-level commitment.');
    }
  }

  return { strengths, limitations };
}

/**
 * Phase 4 — the causal narrative (real fix, not decoration). Before
 * this, "why this gap exists" and "why this candidate scores well"
 * were two disconnected explanations shown on separate parts of the
 * screen. This builds ONE continuous, deterministic sentence — built
 * entirely from real fields (gap.reason, the candidate's own top
 * evidence), never AI-generated free text, consistent with every
 * other explanation in this engine.
 */
function buildCausalNarrative(gap, candidateName, explanation) {
  const topStrength = explanation.strengths[0] || 'their profile aligns with what this role needs';
  const additionalStrengths = explanation.strengths.slice(1, 2); // one more, keep it a single readable sentence
  const strengthClause = additionalStrengths.length > 0
    ? `${topStrength.replace(/\.$/, '')}, and ${additionalStrengths[0].charAt(0).toLowerCase()}${additionalStrengths[0].slice(1).replace(/\.$/, '')}`
    : topStrength.replace(/\.$/, '');

  const verb = candidateName === 'You' ? 'close' : 'closes';
  return `This venture needs a ${gap.role} because ${gap.reason.charAt(0).toLowerCase()}${gap.reason.slice(1).replace(/\.$/, '')}. ${candidateName} ${verb} exactly that — ${strengthClause}.`;
}

/**
 * Retrieves eligible candidates (hard filters, TRD §23) and ranks them
 * against a specific gap. Persists results as recommendations.
 */
async function rankCandidatesForGap(gapId) {
  const gapResult = await pool.query('SELECT * FROM gaps WHERE id = $1', [gapId]);
  if (gapResult.rows.length === 0) return { success: false, error: 'GAP_NOT_FOUND' };
  const gap = gapResult.rows[0];

  const startupResult = await pool.query('SELECT * FROM startups WHERE id = $1', [gap.startup_id]);
  const startup = startupResult.rows[0];

  // Real fix for a confirmed bug: unclaimed/imported startups (verification_status
  // = UNVERIFIED, owned by the system-import account) have no real, responsive
  // founder — recommending a contributor message one is a genuine dead end, not
  // an actionable match. Skip ranking entirely for these.
  if (startup.verification_status === 'UNVERIFIED') {
    return { success: true, recommendations: [], skipped: 'STARTUP_NOT_CLAIMED' };
  }

  // Hard filters: must be a CONTRIBUTOR, profile must be discoverable,
  // and must not already be on this startup's team.
  // Phase 2: real semantic similarity via pgvector cosine distance,
  // computed alongside the deterministic attributes in one query —
  // NULL when either side lacks an embedding yet, handled explicitly
  // below rather than silently treated as zero similarity.
  const candidatesResult = await pool.query(
    `SELECT u.id as user_id, p.headline, p.skills, cp.availability, cp.preferred_domains,
            cp.preferred_stage, cp.experience_years, cp.equity_preference,
            CASE WHEN p.embedding IS NOT NULL AND $2::vector IS NOT NULL
                 THEN 1 - (p.embedding <=> $2::vector) ELSE NULL END as semantic_similarity
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     JOIN contributor_profiles cp ON cp.profile_id = p.id
     WHERE u.primary_role = 'CONTRIBUTOR'
       AND p.visibility = 'DISCOVERABLE'
       AND u.id NOT IN (SELECT user_id FROM startup_team_members WHERE startup_id = $1)`,
    [startup.id, gap.embedding || null]
  );

  if (candidatesResult.rows.length === 0) {
    return { success: true, recommendations: [], note: 'No eligible contributors currently on the platform.' };
  }

  const { getPreferenceAdjustment } = require('../feedback/feedbackService');
  const signalKeys = [`stage:${(startup.stage || '').toLowerCase()}`, ...(startup.domain || []).map(d => `domain:${d.toLowerCase()}`)];
  const feedbackAdjustment = await getPreferenceAdjustment(startup.founder_id, signalKeys);

  const ranked = candidatesResult.rows.map(candidate => {
    const { score, breakdown, overlap, domainOverlap } = scoreCandidate(gap, startup, candidate, feedbackAdjustment);
    const explanation = explainScore(gap, breakdown, overlap, domainOverlap);
    const causalNarrative = buildCausalNarrative(gap, candidate.headline || 'This candidate', explanation);
    return { candidate, score, breakdown, explanation, causalNarrative };
  }).sort((a, b) => b.score - a.score);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM recommendations WHERE source_gap_id = $1', [gapId]);

    const inserted = [];
    for (let i = 0; i < ranked.length; i++) {
      const r = ranked[i];
      const row = await client.query(
        `INSERT INTO recommendations (startup_id, target_user_id, source_gap_id, recommendation_type, score, rank, score_breakdown, explanation)
         VALUES ($1, $2, $3, 'CONTRIBUTOR', $4, $5, $6, $7) RETURNING *`,
        [startup.id, r.candidate.user_id, gapId, r.score, i + 1, JSON.stringify(r.breakdown), JSON.stringify(r.explanation)]
      );
      inserted.push({ ...row.rows[0], candidate_headline: r.candidate.headline, causal_narrative: r.causalNarrative });
    }
    await client.query('COMMIT');
    return { success: true, recommendations: inserted };
  } catch (err) {
    await client.query('ROLLBACK');
    return { success: false, error: 'PERSISTENCE_FAILED', detail: err.message };
  } finally {
    client.release();
  }
}

async function getRecommendationsForStartup(startupId) {
  const result = await pool.query(
    `SELECT r.*, p.headline as candidate_headline, g.role as gap_role, g.reason as gap_reason
     FROM recommendations r
     JOIN profiles p ON p.user_id = r.target_user_id
     LEFT JOIN gaps g ON g.id = r.source_gap_id
     WHERE r.startup_id = $1 ORDER BY r.source_gap_id, r.rank`,
    [startupId]
  );
  const withNarrative = result.rows.map(r => ({
    ...r,
    causal_narrative: r.gap_role && r.gap_reason ? buildCausalNarrative({ role: r.gap_role, reason: r.gap_reason }, r.candidate_headline, r.explanation) : null
  }));
  return { success: true, recommendations: withNarrative };
}

/**
 * Real gap found while wiring the Contributor dashboard: the existing
 * getRecommendationsForStartup() answers "who should this startup hire"
 * but there was no symmetric "what startups match ME" query for a
 * contributor's own dashboard. Added here rather than left unbuilt.
 */
async function getMyRecommendationsAsContributor(userId) {
  // Real fix, per direct question: not every technically-ranked gap
  // should be shown as an "opportunity" — a genuine minimum-relevance
  // threshold matters. 0.20 was chosen from actual score distribution:
  // matches with real skill/domain/stage overlap score 0.24+ in this
  // engine; 0.17-tier matches had ZERO overlap on every dimension
  // except a nonzero experienceFit — noise, not a real opportunity.
  const MIN_RELEVANCE_SCORE = 0.20;

  const result = await pool.query(
    `SELECT r.*, s.name as startup_name, s.domain, s.stage, s.founder_id, g.role as gap_role, g.reason as gap_reason
     FROM recommendations r
     JOIN startups s ON s.id = r.startup_id
     JOIN gaps g ON g.id = r.source_gap_id
     WHERE r.target_user_id = $1 AND r.recommendation_type = 'CONTRIBUTOR' AND r.status = 'ACTIVE'
       AND r.score >= $2
     ORDER BY r.score DESC LIMIT 20`,
    [userId, MIN_RELEVANCE_SCORE]
  );
  const withNarrative = result.rows.map(r => ({
    ...r,
    causal_narrative: r.gap_role && r.gap_reason ? buildCausalNarrative({ role: r.gap_role, reason: r.gap_reason }, 'You', r.explanation) : null
  }));
  return { success: true, recommendations: withNarrative };
}

module.exports = { scoreCandidate, explainScore, buildCausalNarrative, rankCandidatesForGap, getRecommendationsForStartup, getMyRecommendationsAsContributor, getWeights };
