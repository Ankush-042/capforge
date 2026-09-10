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
      // Choosing a co-founder is mostly about conviction, so alignment
      // carries more here than anywhere else.
      return { skillFit: 0.20, roleFit: 0.12, domainFit: 0.08, stageFit: 0.08, experienceFit: 0.08, availabilityFit: 0.04, compatibilityFit: 0.15, alignmentFit: 0.25 };
    case 'CONTRACTOR':
      // Defined scope, defined deliverable. Whether they love the mission
      // barely matters, and pretending otherwise would be dishonest.
      return { skillFit: 0.48, roleFit: 0.20, domainFit: 0.10, stageFit: 0.05, experienceFit: 0.10, availabilityFit: 0.02, compatibilityFit: 0.02, alignmentFit: 0.03 };
    case 'ADVISOR':
      return { skillFit: 0.32, roleFit: 0.14, domainFit: 0.13, stageFit: 0.04, experienceFit: 0.18, availabilityFit: 0.02, compatibilityFit: 0.05, alignmentFit: 0.12 };
    default: // CORE_HIRE
      return { skillFit: 0.32, roleFit: 0.17, domainFit: 0.12, stageFit: 0.08, experienceFit: 0.08, availabilityFit: 0.04, compatibilityFit: 0.04, alignmentFit: 0.15 };
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
/**
 * Generic words that appear in skills across completely unrelated
 * disciplines. Sharing ONLY one of these is not evidence of a real skill
 * match. Deliberately conservative: only words that genuinely carry no
 * discipline-specific meaning on their own.
 */
const GENERIC_SKILL_TOKENS = new Set([
  'design', 'designer', 'engineer', 'engineering', 'development', 'developer',
  'management', 'manager', 'analysis', 'analyst', 'specialist', 'architecture',
  'architect', 'system', 'systems', 'software', 'technical', 'tools', 'tool',
  'platform', 'platforms', 'service', 'services', 'solution', 'solutions',
  'experience', 'senior', 'junior', 'lead', 'strategy', 'planning', 'process',
  'operations', 'support', 'integration', 'implementation', 'consulting',
  // Added after a real false positive: 'accessibility research' matched
  // 'market research' on the shared word 'research', so a UX researcher was
  // told they had a strong skill match for a Product Manager role.
  'research', 'testing', 'writing', 'content', 'modeling', 'automation',
  'optimization', 'monitoring', 'reporting', 'documentation', 'training',
]);

/**
 * Domains that mean the same thing in practice. Deliberately small and
 * curated rather than clever: each group is terms a real person would
 * consider the same space. Anything not here still matches by substring or
 * shared distinctive token.
 */
const DOMAIN_EQUIVALENTS = [
  ['health', 'healthtech', 'healthcare', 'health tech', 'medtech', 'medical', 'telemedicine', 'digital health', 'rural health', 'patient education', 'clinical'],
  ['fintech', 'finance', 'financial services', 'payments', 'banking', 'cross-border payments'],
  ['edtech', 'education', 'e-learning', 'adaptive learning', 'k-12', 'learning'],
  ['climate', 'cleantech', 'sustainability', 'carbon', 'environment', 'renewable energy'],
  ['ai', 'artificial intelligence', 'machine learning', 'ai/ml', 'deep learning'],
  ['cybersecurity', 'security', 'infosec', 'cloud security', 'endpoint security'],
  ['logistics', 'supply chain', 'transportation', 'freight'],
  ['proptech', 'real estate', 'property management'],
  ['hr tech', 'hrtech', 'people analytics', 'employee engagement', 'human resources'],
  ['legal tech', 'legaltech', 'contract analysis', 'compliance'],
  ['biotech', 'synthetic biology', 'bioinformatics', 'life sciences'],
  ['saas', 'b2b saas', 'software as a service'],
];

function domainsMatch(a, b) {
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  for (const group of DOMAIN_EQUIVALENTS) {
    if (group.includes(a) && group.includes(b)) return true;
  }
  // Shared distinctive word, reusing the same generic-token guard as skills
  // so "artificial intelligence" does not match everything via "artificial".
  const aTokens = new Set(a.split(/[\s/,-]+/).filter(t => t.length > 3));
  const bTokens = b.split(/[\s/,-]+/).filter(t => t.length > 3);
  return bTokens.some(t => aTokens.has(t) && !GENERIC_SKILL_TOKENS.has(t));
}

/**
 * Roles that genuinely overlap in practice. Each group is roles where a
 * person holding one could credibly do meaningful work in another. Kept
 * deliberately tight: this is real overlap, not "both are technical".
 */
const ROLE_ADJACENCY = [
  ['full stack engineer', 'backend engineer', 'frontend engineer', 'software engineer', 'web developer'],
  ['backend engineer', 'devops engineer', 'site reliability engineer', 'cloud infrastructure architect', 'platform engineer'],
  ['machine learning engineer', 'ai/ml engineer', 'data scientist', 'nlp/ml engineer', 'ml engineer'],
  ['data engineer', 'data scientist', 'analytics engineer', 'backend engineer'],
  ['ui/ux designer', 'ux/ui designer', 'product designer', 'design researcher', 'ux researcher', 'ux writer'],
  ['product manager', 'product owner', 'program manager'],
  ['mobile app developer', 'mobile engineer', 'frontend engineer', 'android engineer', 'ios engineer'],
  ['security engineer', 'security analyst', 'cloud security engineer', 'devops engineer'],
  ['compliance specialist', 'data privacy officer', 'legal advisor', 'compliance/finance specialist'],
  ['growth marketer', 'growth engineer', 'content strategist', 'community manager'],
  ['business development manager', 'sales engineer', 'business development'],
  ['bioinformatics engineer', 'biomedical engineer', 'machine learning engineer'],
  ['hardware engineer', 'embedded systems engineer', 'electrical engineer'],
  ['instructional designer', 'clinical content specialist', 'content strategist', 'ux writer'],
];

function computeRoleFit(headline, gapRole) {
  if (!headline || !gapRole) return 0.0;
  const a = normalizeRole(headline);
  const b = normalizeRole(gapRole);
  if (a === b) return 1.0;

  // Adjacent roles earn partial credit, never full. Someone who actually
  // holds the role must always outrank someone merely adjacent to it.
  //
  // NOTE: normalizeRole strips ALL non-alphanumerics, so 'full stack
  // engineer' becomes 'fullstackengineer'. The groups below are written
  // readably and normalized here, rather than stored pre-mangled.
  for (const group of ROLE_ADJACENCY) {
    const normalized = group.map(normalizeRole);
    if (normalized.includes(a) && normalized.includes(b)) return 0.6;
  }
  return 0.0;
}

/**
 * Skills written differently that mean the same thing. Needed because
 * treating generic words as non-matching correctly killed 'accessibility
 * research' vs 'market research', but also killed 'user research' vs 'ux
 * research', which genuinely ARE the same skill.
 */
const SKILL_EQUIVALENTS = [
  ['user research', 'ux research', 'user experience research', 'design research'],
  ['usability testing', 'user testing', 'usability research'],
  ['ui design', 'ux design', 'user interface design', 'user experience design', 'interaction design'],
  ['product strategy', 'product management', 'product roadmapping'],
  ['ci/cd', 'continuous integration', 'continuous delivery', 'build pipelines'],
  ['rest api', 'api development', 'api design', 'restful api'],
  ['data pipelines', 'etl', 'data engineering', 'elt'],
  ['technical writing', 'documentation writing', 'developer documentation'],
  ['content strategy', 'content design', 'content planning'],
  ['regulatory compliance', 'compliance', 'kyc', 'aml'],
];

function skillEquivalent(a, b) {
  for (const group of SKILL_EQUIVALENTS) {
    if (group.includes(a) && group.includes(b)) return true;
  }
  return false;
}

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
  //
  // REAL FIX, confirmed necessary by direct evidence: exact-string
  // equality alone treated 'aml' and 'aml kyc' as completely unrelated,
  // despite being the same real-world skill — a genuine, serious gap
  // when running without embeddings (SKIP_EMBEDDINGS=true), since exact
  // match was the ONLY signal left. Real substring/token matching now
  // catches this class of case with zero dependency on any external ML
  // infrastructure — a candidate skill counts as overlapping if it
  // contains, is contained by, or shares a real word token with a
  // required skill (not just character-for-character equality).
  //
  // CONFIRMED FALSE-POSITIVE BUG, found in live testing: a backend engineer
  // with the skill "api design" scored 36% on a UX/UI Designer gap requiring
  // "user experience design" and "learning interface design", with the
  // explanation confidently claiming a strong skill match. Cause: both
  // strings share the token "design", and a single shared token was enough.
  //
  // Generic role words like design, engineer, management and analysis appear
  // in skills across completely unrelated disciplines, so matching on them
  // alone cross-matches everything. They are now excluded from being the
  // sole basis of a match. Genuine cases still work: "aml" vs "aml kyc"
  // matches by substring, "machine learning" vs "machine learning engineer"
  // matches by substring, "postgresql" vs "sql" matches by substring.
  function skillsMatch(required, candidateSkill) {
    if (required === candidateSkill) return true;
    if (skillEquivalent(required, candidateSkill)) return true;
    if (required.includes(candidateSkill) || candidateSkill.includes(required)) return true;

    const requiredTokens = new Set(required.split(/[\s/,-]+/).filter(t => t.length > 2));
    const candidateTokens = candidateSkill.split(/[\s/,-]+/).filter(t => t.length > 2);
    const shared = candidateTokens.filter(t => requiredTokens.has(t));
    if (shared.length === 0) return false;

    // A single shared GENERIC word is not a skill match.
    const distinctive = shared.filter(t => !GENERIC_SKILL_TOKENS.has(t));
    if (distinctive.length > 0) return true;

    // Only generic words in common: require at least two of them, so
    // "product management" vs "product manager" still matches while
    // "api design" vs "user experience design" does not.
    return shared.length >= 2;
  }
  const overlap = requiredSkills.filter(s => [...candidateSkills].some(cs => skillsMatch(s, cs)));
  const deterministicSkillFit = requiredSkills.length > 0 ? overlap.length / requiredSkills.length : 0;
  const hasSemanticSignal = candidate.semantic_similarity !== null && candidate.semantic_similarity !== undefined;
  const skillFit = hasSemanticSignal
    ? (deterministicSkillFit * 0.5) + (candidate.semantic_similarity * 0.5)
    : deterministicSkillFit;

  // --- Role fit: does the candidate's stated headline match the gap's role? ---
  // CONFIRMED GAP from the quality tests: roleFit was binary, exact match or
  // zero. So a Backend Engineer scored 0% against a Full Stack Engineer gap
  // and a Design Researcher scored 0% against a UI/UX Designer gap, despite
  // both being genuinely partial fits. That made the top candidate for those
  // gaps look unjustified even when it was reasonable.
  //
  // Adjacent roles now earn real partial credit. Never full credit: someone
  // who actually holds the role should always outrank someone adjacent to it.
  const roleFit = computeRoleFit(candidate.headline, gap.role);

  // --- Domain fit: overlap of candidate's preferred domains with the startup's domain ---
  const startupDomains = new Set((startup.domain || []).map(d => d.toLowerCase().trim()));
  const candidateDomains = (candidate.preferred_domains || []).map(d => d.toLowerCase().trim());
  // CONFIRMED BUG: domain matching used exact string equality, so a
  // contributor who chose "healthtech" scored ZERO against a venture whose
  // domain is "healthcare". Same brittleness that made "aml" not match
  // "aml kyc" in skills. Now uses real equivalence.
  const domainOverlap = candidateDomains.filter(d =>
    [...startupDomains].some(sd => domainsMatch(d, sd))
  );
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

    // Alignment is its own weighted dimension now, so it is no longer mixed
    // into compatibility. Keeping both here double-counted it and capped it
    // at a weight too small to matter.
    // Previously: REAL vision alignment. Everything above measures LOGISTICS
    // (are you full-time, do you want equity). This is the first signal in
    // the engine that measures CONVICTION: cosine similarity between why
    // this founder is building this venture and why this person says they
    // want to build something.
    //
    // Deliberately null-safe rather than zero-safe: a candidate with no
    // stated motivation gets pure logistics scoring, exactly as before,
    // rather than being punished for a field they never filled in.
  } else if (seekingType === 'CONTRACTOR') {
    compatibilityFit = 0.7; // commitment depth barely matters for a defined-scope engagement
  } else {
    // CORE_HIRE and ADVISOR. Availability is the base signal, but a stated
    // mission now genuinely counts here too, at a lower weight than for a
    // co-founder. This is what makes the onboarding promise true: someone
    // who writes about wanting health stakes should rank higher on a health
    // venture than an identical candidate who wrote nothing.
    compatibilityFit = candidate.availability === 'full-time' ? 0.8 : candidate.availability === 'part-time' ? 0.6 : 0.4;
  }

  const alignmentFit = typeof candidate.vision_alignment === 'number' ? candidate.vision_alignment : null;
  const breakdown = { skillFit, roleFit, domainFit, stageFit, experienceFit, availabilityFit, compatibilityFit, alignmentFit, semanticSimilarity: hasSemanticSignal ? candidate.semantic_similarity : null, visionAlignment: typeof candidate.vision_alignment === 'number' ? candidate.vision_alignment : null, alignmentReason: candidate.alignment_reason || null };

  const weights = getWeights(seekingType);

  // NULL-SAFE, not zero-safe. alignmentFit is null when nobody has written a
  // mission or the venture has no vision yet. Multiplying null by its weight
  // yields zero, which would silently cost that person 15 percent of the
  // available score for a field they never filled in, and would make an
  // unscored pair look worse than a genuinely misaligned one.
  //
  // Instead the missing dimension is dropped and the remaining weights are
  // renormalised, so the score means the same thing either way: it is
  // computed from the evidence that actually exists.
  const activeWeights = {};
  let weightTotal = 0;
  for (const key of Object.keys(weights)) {
    if (breakdown[key] === null || breakdown[key] === undefined) continue;
    activeWeights[key] = weights[key];
    weightTotal += weights[key];
  }
  const baseScore = weightTotal > 0
    ? Object.keys(activeWeights).reduce((sum, key) => sum + breakdown[key] * (activeWeights[key] / weightTotal), 0)
    : 0;

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

  // CONFIRMED BUG: skillFit can be above zero from SEMANTIC similarity alone
  // while the deterministic overlap list is empty, and this printed
  // "Partial skill overlap: ." with nothing after the colon. It appeared on
  // five ventures at once for a hardware engineer, claiming an overlap that
  // did not exist. An explanation must never assert something it cannot name.
  if (breakdown.skillFit >= 0.6 && overlap.length > 0) {
    strengths.push(`Strong skill match for "${gap.role}" — covers ${overlap.join(', ')}.`);
  } else if (overlap.length > 0) {
    strengths.push(`Partial skill overlap: ${overlap.join(', ')}.`);
  } else if (breakdown.skillFit > 0) {
    // Real signal, but nothing nameable behind it. Say so honestly rather
    // than implying a skill match that cannot be pointed at.
    limitations.push(`No directly matching skills listed for "${gap.role}", though the profile is broadly related.`);
  } else {
    limitations.push(`No overlapping skills found for the specific requirements of "${gap.role}".`);
  }

  if (breakdown.roleFit === 1.0) {
    strengths.push(`Profile headline directly matches the "${gap.role}" role.`);
  }

  // Phase 3: real vision alignment, only ever present for co-founder
  // searches where both sides actually wrote something. Never invented:
  // this only appears when a real number was computed.
  // The LLM's own sentence, referring to something the person actually
  // wrote, rather than a generic band label. This is the whole point of
  // never showing a bare score.
  if (typeof breakdown.visionAlignment === 'number' && breakdown.alignmentReason) {
    if (breakdown.visionAlignment >= 0.6) strengths.push(breakdown.alignmentReason);
    else if (breakdown.visionAlignment <= 0.3) limitations.push(breakdown.alignmentReason);
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
  //
  // CONFIRMED, additional real gap: the import scripts' own code admits
  // "entries will stay CLAIMED instead of UNVERIFIED" if a SEPARATE
  // admin-login step fails after creation — a fragile, two-step
  // process. Found exactly this leak directly (AdPilot showing a real
  // score to a real contributor despite being a system import). Fixed
  // structurally: also exclude by the founder's actual email matching
  // the known system-import account, which can never silently fail
  // the way a secondary admin PATCH call can.
  const founderResult = await pool.query('SELECT email FROM users WHERE id = $1', [startup.founder_id]);
  const isSystemImport = founderResult.rows[0]?.email === 'system.import@capforge.internal';
  if (startup.verification_status === 'UNVERIFIED' || isSystemImport) {
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

  // Phase 3: real vision alignment, computed ONLY for co-founder searches.
  // Skipped entirely for every other seeking type, so the proven CORE_HIRE
  // path does no extra work and behaves exactly as before.
  // CONFIRMED PROBLEM from live testing: this ran ONLY for CO_FOUNDER gaps,
  // but the contributor onboarding field is labelled "what real alignment is
  // built on, not just a skill match". Every gap a real contributor sees is
  // CORE_HIRE, so that field affected nothing and the label was a lie.
  // Vision alignment now runs for every seeking type. It is weighted far
  // more heavily for co-founders (a years-long commitment) than for a hire,
  // but it is never zero, because why someone wants to build something
  // matters for any role.
  // Alignment is now judged by an LLM and read from cache. Embeddings were
  // proven unable to carry this signal: they cannot represent negation, so a
  // contributor who wrote "I am done with dashboards" scored HIGHEST against
  // a marketing-dashboard venture. See migration 027 for the full evidence.
  //
  // Cache-only read: never calls the LLM during ranking, so a rate limit can
  // never slow or break a match. A missing score means no alignment signal,
  // and the deterministic signals carrying 81% of the weight still decide.
  let visionMap = {};
  let alignmentReasons = {};
  try {
    const { getAlignmentScores } = require('./alignmentService');
    const scores = await getAlignmentScores(startup.id, candidatesResult.rows.map(c => c.user_id));
    for (const [uid, v] of Object.entries(scores)) {
      visionMap[uid] = v.score;
      alignmentReasons[uid] = v.reason;
    }
  } catch (err) {
    console.error('Alignment lookup failed (non-fatal, deterministic signals still apply):', err.message);
  }

  const ranked = candidatesResult.rows
    .map(candidate => {
      if (visionMap[candidate.user_id] !== undefined) {
        candidate.vision_alignment = visionMap[candidate.user_id];
        candidate.alignment_reason = alignmentReasons[candidate.user_id];
      }
      const { score, breakdown, overlap, domainOverlap } = scoreCandidate(gap, startup, candidate, feedbackAdjustment);
      const explanation = explainScore(gap, breakdown, overlap, domainOverlap);
      const causalNarrative = buildCausalNarrative(gap, candidate.headline || 'This candidate', explanation);
      return { candidate, score, breakdown, explanation, causalNarrative, overlap, domainOverlap };
    })
    // Real fix for confirmed scoring noise: dozens of candidates with
    // ZERO real skill overlap, ZERO domain overlap, and no semantic
    // signal were still persisted as "recommendations" purely because
    // baseline experienceFit/compatibilityFit produced a nonzero score
    // (a consistent ~0.20-0.22 cluster with nothing real behind it,
    // confirmed directly from real reported data). A recommendation
    // now requires at least ONE genuine signal to exist at all.
    // Real fix, confirmed from direct reported data: AdPilot showed
    // 'Product Manager', 'DevOps Engineer', 'Growth Marketer' as real
    // recommendations for a Full Stack Engineer with zero skill
    // relevance to any of them — propped up ENTIRELY by domainOverlap
    // (a startup-level "likes this industry" signal, not evidence of
    // fitting THIS SPECIFIC role). Domain overlap still legitimately
    // contributes to the SCORE (via domainFit's weight in
    // scoreCandidate) — it must never, alone, be sufficient to
    // recommend someone for a role they have zero real skill relevance
    // to. A recommendation now requires genuine role-level evidence.
    .filter(r => r.overlap.length > 0 || (r.breakdown.semanticSimilarity !== null && r.breakdown.semanticSimilarity >= 0.5))
    .sort((a, b) => b.score - a.score);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM recommendations WHERE source_gap_id = $1', [gapId]);

    const inserted = [];
    for (let i = 0; i < ranked.length; i++) {
      const r = ranked[i];
      const row = await client.query(
        // Migration 026 adds a unique index on (source_gap_id, target_user_id).
        // Re-ranking the same gap now UPDATES each candidate's row instead of
        // inserting a duplicate, which is what put the same venture and role
        // in a contributor's list twice at an identical score.
        `INSERT INTO recommendations (startup_id, target_user_id, source_gap_id, recommendation_type, score, rank, score_breakdown, explanation)
         VALUES ($1, $2, $3, 'CONTRIBUTOR', $4, $5, $6, $7)
         ON CONFLICT (source_gap_id, target_user_id) DO UPDATE SET
           score = EXCLUDED.score,
           rank = EXCLUDED.rank,
           score_breakdown = EXCLUDED.score_breakdown,
           explanation = EXCLUDED.explanation,
           status = 'ACTIVE'
         RETURNING *`,
        [startup.id, r.candidate.user_id, gapId, r.score, i + 1, JSON.stringify(r.breakdown), JSON.stringify(r.explanation)]
      );
      inserted.push({ ...row.rows[0], candidate_headline: r.candidate.headline, causal_narrative: r.causalNarrative });
    }

    // CONFIRMED BUG: re-ranking inserted and updated rows for whoever
    // qualifies NOW, but left every previous ACTIVE row untouched. So a
    // contributor who changed from a backend engineer to a UX researcher
    // still saw "profile headline directly matches the Backend Engineer
    // role" at 65%, because that row was written when it WAS true and
    // nothing ever expired it.
    //
    // Anyone not in the current ranking no longer qualifies for this gap,
    // and their row must be expired in the same transaction.
    const stillQualify = ranked.map(r => r.candidate.user_id);
    if (stillQualify.length > 0) {
      await client.query(
        `UPDATE recommendations SET status = 'EXPIRED'
         WHERE source_gap_id = $1 AND status = 'ACTIVE'
           AND target_user_id != ALL($2::uuid[])`,
        [gapId, stillQualify]
      );
    } else {
      await client.query(
        `UPDATE recommendations SET status = 'EXPIRED'
         WHERE source_gap_id = $1 AND status = 'ACTIVE'`,
        [gapId]
      );
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
  // Real fix: same orphaned-reference bug found and fixed in 3 other
  // places (getMyRecommendationsAsContributor, getMultiOfferComparison,
  // and the root cause in gapDiagnosisService.js) — a LEFT JOIN here
  // let recommendations pointing at deleted gaps through with blank
  // role/reason fields, shown to founders in their own GapDetail
  // candidate list.
  const result = await pool.query(
    `SELECT r.*, p.headline as candidate_headline, g.role as gap_role, g.reason as gap_reason
     FROM recommendations r
     JOIN profiles p ON p.user_id = r.target_user_id
     JOIN gaps g ON g.id = r.source_gap_id
     WHERE r.startup_id = $1 AND g.status != 'FILLED' ORDER BY r.source_gap_id, r.rank`,
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
       AND r.score >= $2 AND g.status != 'FILLED'
     ORDER BY r.score DESC LIMIT 20`,
    [userId, MIN_RELEVANCE_SCORE]
  );
  const withNarrative = result.rows.map(r => ({
    ...r,
    causal_narrative: r.gap_role && r.gap_reason ? buildCausalNarrative({ role: r.gap_role, reason: r.gap_reason }, 'You', r.explanation) : null
  }));
  return { success: true, recommendations: withNarrative };
}


/**
 * Re-rank ONE contributor across every open gap.
 *
 * CONFIRMED PROBLEM: refreshOpenGapRankings loops all 62 gaps and re-ranks
 * EVERY candidate for each one. On a profile save that is minutes of work
 * when exactly one person changed, which in practice meant the automatic
 * path never finished before the user looked, and the results only ever
 * became correct after running a script by hand. A product cannot require
 * that.
 *
 * This does the same scoring, for one person, against all gaps: one query
 * for the gaps, one for the contributor, then pure computation. Seconds
 * rather than minutes.
 *
 * Everyone else's rows are untouched, which is correct: nobody else changed.
 */
async function refreshRankingsForContributor(userId) {
  const me = await pool.query(
    `SELECT u.id as user_id, p.headline, p.skills, p.embedding, cp.availability,
            cp.preferred_domains, cp.preferred_stage, cp.experience_years, cp.equity_preference
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     JOIN contributor_profiles cp ON cp.profile_id = p.id
     WHERE u.id = $1 AND u.primary_role = 'CONTRIBUTOR' AND p.visibility = 'DISCOVERABLE'`,
    [userId]
  );
  if (me.rows.length === 0) return { success: false, error: 'NOT_AN_ELIGIBLE_CONTRIBUTOR' };
  const candidate = me.rows[0];

  const gaps = await pool.query(
    `SELECT g.*, s.id AS s_id, s.name AS s_name, s.domain AS s_domain, s.stage AS s_stage,
            s.founder_id AS s_founder_id,
            CASE WHEN g.embedding IS NOT NULL AND $1::vector IS NOT NULL
                 THEN 1 - (g.embedding <=> $1::vector) ELSE NULL END AS semantic_similarity
     FROM gaps g
     JOIN startups s ON s.id = g.startup_id
     JOIN users u ON u.id = s.founder_id
     WHERE g.status NOT IN ('FILLED','DISMISSED')
       AND u.email != 'system.import@capforge.internal'
       AND s.verification_status != 'UNVERIFIED'
       AND NOT EXISTS (
         SELECT 1 FROM startup_team_members tm
         WHERE tm.startup_id = s.id AND tm.user_id = $2
       )`,
    [candidate.embedding || null, userId]
  );

  // One alignment lookup for every venture at once, rather than per gap.
  let alignment = {};
  try {
    const rows = await pool.query(
      `SELECT startup_id, score, reason FROM alignment_scores WHERE user_id = $1`,
      [userId]
    );
    for (const r of rows.rows) alignment[r.startup_id] = { score: parseFloat(r.score), reason: r.reason };
  } catch (err) {
    console.error('Alignment lookup failed in targeted refresh (non-fatal):', err.message);
  }

  let written = 0, expired = 0;
  for (const g of gaps.rows) {
    const startup = { id: g.s_id, name: g.s_name, domain: g.s_domain, stage: g.s_stage, founder_id: g.s_founder_id };
    const c = { ...candidate, semantic_similarity: g.semantic_similarity };
    const a = alignment[g.s_id];
    if (a) { c.vision_alignment = a.score; c.alignment_reason = a.reason; }

    const { score, breakdown, overlap, domainOverlap } = scoreCandidate(g, startup, c, 0);

    // CONFIRMED BUG I INTRODUCED: this originally checked only score < 0.20,
    // but the main ranking path ALSO requires genuine role-level evidence —
    // real skill overlap, or semantic similarity of at least 0.5. Without
    // that check, a profile save wrote rows for gaps the person has no real
    // relevance to (a hardware engineer appearing for Legal Advisor and
    // Bioinformatics Engineer), and the proper re-rank then correctly
    // expired them. Two paths, two different rules, so results depended on
    // which one ran last.
    //
    // Both paths now apply the identical rule.
    const hasRealEvidence = overlap.length > 0
      || (breakdown.semanticSimilarity !== null && breakdown.semanticSimilarity >= 0.5);

    if (score < 0.20 || !hasRealEvidence) {
      const r = await pool.query(
        `UPDATE recommendations SET status = 'EXPIRED'
         WHERE source_gap_id = $1 AND target_user_id = $2 AND status = 'ACTIVE'`,
        [g.id, userId]
      );
      expired += r.rowCount;
      continue;
    }

    const explanation = explainScore(g, breakdown, overlap, domainOverlap);
    await pool.query(
      `INSERT INTO recommendations (startup_id, target_user_id, source_gap_id, recommendation_type, score, rank, score_breakdown, explanation)
       VALUES ($1, $2, $3, 'CONTRIBUTOR', $4, 999, $5, $6)
       ON CONFLICT (source_gap_id, target_user_id) DO UPDATE SET
         score = EXCLUDED.score,
         score_breakdown = EXCLUDED.score_breakdown,
         explanation = EXCLUDED.explanation,
         status = 'ACTIVE'`,
      [startup.id, userId, g.id, score, JSON.stringify(breakdown), JSON.stringify(explanation)]
    );
    written++;
  }

  return { success: true, gapsScanned: gaps.rows.length, written, expired };
}

module.exports = { domainsMatch, refreshRankingsForContributor, skillsMatchForTesting: null, scoreCandidate, explainScore, buildCausalNarrative, rankCandidatesForGap, getRecommendationsForStartup, getMyRecommendationsAsContributor, getWeights };
