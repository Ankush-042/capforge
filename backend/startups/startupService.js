/**
 * Startup creation + AI idea-structuring orchestration.
 * Ref: TRD §15-16, App Flow §4.2, SRS §13-17.
 *
 * Non-negotiable per architecture doc §106 Rule 5: AI output is never
 * trusted blindly — every call here goes through the Sprint-0-validated
 * schema validation before persistence, and every AI operation is
 * traceable via an ai_jobs row (Rule: no fake persistence).
 */
const pool = require('../shared/db');
const { structureIdea } = require('../ai/ideaStructuring');

const RETRY_LIMIT = 2;

/**
 * SRS §13: Founder creates a startup with a raw idea.
 * Persists immediately (draft), then triggers AI structuring.
 * If AI structuring fails, the founder's raw idea is NEVER lost —
 * this is the exact failure mode the AI spec Rule 8 forbids destroying.
 */
async function createStartup(founderId, { name, rawIdea, currentTeamSize, fundingRaised, fundingStage, targetTimeline, equityOfferedRange, founderDomainExpertise, founderPriorExperience }) {
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'MISSING_NAME' };
  }
  if (!rawIdea || rawIdea.trim().length < 10) {
    return { success: false, error: 'IDEA_TOO_SHORT', detail: 'Describe your idea in a bit more detail (10+ characters).' };
  }

  const result = await pool.query(
    `INSERT INTO startups (founder_id, name, raw_idea, status, current_team_size, funding_raised, funding_stage, target_timeline, equity_offered_range, founder_domain_expertise, founder_prior_experience)
     VALUES ($1, $2, $3, 'DRAFT', $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [founderId, name.trim(), rawIdea.trim(), currentTeamSize || null, fundingRaised || null, fundingStage || null,
     targetTimeline || null, equityOfferedRange || null, founderDomainExpertise || [], founderPriorExperience || null]
  );
  const startup = result.rows[0];

  // The founder is the venture's first team member by definition — this
  // is what gives gap diagnosis real coverage data to compare against
  // from the very first analysis, rather than showing 100% gaps on
  // every role even when the founder themself covers one of them.
  const profileResult = await pool.query(
    `SELECT p.headline, p.skills FROM profiles p WHERE p.user_id = $1`,
    [founderId]
  );
  const founderProfile = profileResult.rows[0];
  await pool.query(
    `INSERT INTO startup_team_members (startup_id, user_id, role, skills, is_founder)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (startup_id, user_id) DO NOTHING`,
    [startup.id, founderId, founderProfile?.headline || 'Founder', founderProfile?.skills || []]
  );

  // Auto-trigger structuring (App Flow §4.2). Caller gets the draft
  // immediately; analysis result is attached to the response if it
  // completes fast enough, but the draft itself is already durable.
  const analysisResult = await analyzeStartup(founderId, startup.id);

  return { success: true, startup: analysisResult.success ? analysisResult.startup : startup, analysis: analysisResult };
}

/**
 * AI-01 orchestration with full job tracking, retry, and failure isolation.
 * TRD §19, §56-58: bounded retries, never silently corrupt state on failure.
 */
async function analyzeStartup(founderId, startupId) {
  const ownership = await pool.query('SELECT * FROM startups WHERE id = $1 AND founder_id = $2', [startupId, founderId]);
  if (ownership.rows.length === 0) {
    return { success: false, error: 'NOT_FOUND_OR_UNAUTHORIZED' };
  }
  const startup = ownership.rows[0];

  const jobResult = await pool.query(
    `INSERT INTO ai_jobs (user_id, startup_id, job_type, status, model, prompt_version)
     VALUES ($1, $2, 'IDEA_STRUCTURING', 'PROCESSING', 'groq/llama-3.3-70b-versatile', 'idea_structuring_v1')
     RETURNING id`,
    [founderId, startupId]
  );
  const jobId = jobResult.rows[0].id;

  await pool.query(`UPDATE startups SET status = 'ANALYZING', updated_at = now() WHERE id = $1`, [startupId]);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    await failJob(jobId, 'GROQ_API_KEY not configured on server');
    await pool.query(`UPDATE startups SET status = 'DRAFT', updated_at = now() WHERE id = $1`, [startupId]);
    return { success: false, error: 'AI_NOT_CONFIGURED' };
  }

  let aiResult;
  let attempts = 0;
  do {
    attempts++;
    aiResult = await structureIdea(startup.raw_idea, apiKey);
  } while (!aiResult.success && attempts <= RETRY_LIMIT);

  await pool.query('UPDATE ai_jobs SET attempt_count = $1 WHERE id = $2', [attempts, jobId]);

  if (!aiResult.success) {
    await failJob(jobId, aiResult.errors?.join('; ') || 'Unknown AI failure');
    // TRD §101: preserve raw idea, revert to a retryable state — never destroy input.
    await pool.query(`UPDATE startups SET status = 'DRAFT', updated_at = now() WHERE id = $1`, [startupId]);
    return { success: false, error: 'ANALYSIS_FAILED', detail: aiResult.errors };
  }

  const d = aiResult.data;

  // BUG FIX (found via Sprint 7 search testing): the LLM does not
  // guarantee consistent casing across separate calls ("food service"
  // on one run, "Food Service" on another for a conceptually identical
  // domain). Left unnormalized, this silently breaks case-sensitive
  // array-overlap search/matching and produces visible duplicates in
  // any downstream dedup logic. Normalized once, here, at the single
  // point of persistence — every consumer (search, matching, investor
  // scoring) then works with consistent data instead of each needing
  // its own defensive lowercasing.
  const normalizeArray = (arr) => (arr || []).map(s => String(s).toLowerCase().trim());
  d.target_users = normalizeArray(d.target_users);
  d.domain = normalizeArray(d.domain);
  d.business_model = normalizeArray(d.business_model);
  d.technology_requirements = normalizeArray(d.technology_requirements);
  d.risks = normalizeArray(d.risks);
  if (Array.isArray(d.role_requirements)) {
    d.role_requirements = d.role_requirements.map(r => ({
      role: r.role, // role names stay as-is for display; matching already normalizes via normalizeRole()
      skills: normalizeArray(r.skills)
    }));
  }
  const updateResult = await pool.query(
    `UPDATE startups SET
       problem = $1, solution = $2, target_users = $3, domain = $4, business_model = $5,
       stage = $6, role_requirements = $7, technology_requirements = $8,
       risks = $9, confidence = $10, clarification_needed = $11,
       status = 'STRUCTURED', structured_at = now(), updated_at = now(), founder_confirmed = false
     WHERE id = $12 RETURNING *`,
    [d.problem, d.solution, d.target_users, d.domain, d.business_model, d.stage,
     JSON.stringify(d.role_requirements), d.technology_requirements, d.risks,
     JSON.stringify(d.confidence), d.clarification_needed, startupId]
  );

  await pool.query(`UPDATE ai_jobs SET status = 'COMPLETED', completed_at = now() WHERE id = $1`, [jobId]);

  return { success: true, startup: updateResult.rows[0] };
}

async function failJob(jobId, errorMessage) {
  await pool.query(`UPDATE ai_jobs SET status = 'FAILED', error = $1, completed_at = now() WHERE id = $2`, [errorMessage, jobId]);
}

/**
 * SRS §17: founder confirms/edits AI-generated structure.
 * Confirmed data takes precedence over future AI inference (App Flow §4.2 principle).
 */
async function confirmStartup(founderId, startupId, edits) {
  const ownership = await pool.query('SELECT id FROM startups WHERE id = $1 AND founder_id = $2', [startupId, founderId]);
  if (ownership.rows.length === 0) {
    return { success: false, error: 'NOT_FOUND_OR_UNAUTHORIZED' };
  }

  const editableFields = ['problem', 'solution', 'target_users', 'domain', 'business_model', 'stage',
                           'role_requirements', 'technology_requirements', 'risks'];
  const fields = Object.keys(edits || {}).filter(k => editableFields.includes(k));

  let setClauses = fields.map((f, i) => `${f} = $${i + 2}`);
  let values = fields.map(f => f === 'role_requirements' ? JSON.stringify(edits[f]) : edits[f]);

  setClauses.push('founder_confirmed = true', "status = 'ACTIVE'", 'updated_at = now()');

  const result = await pool.query(
    `UPDATE startups SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    [startupId, ...values]
  );
  return { success: true, startup: result.rows[0] };
}

async function getStartup(startupId, requestingUserId) {
  const result = await pool.query('SELECT * FROM startups WHERE id = $1', [startupId]);
  if (result.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const startup = result.rows[0];

  // Visibility check: owner always sees it; others only if discoverable+active.
  const isOwner = startup.founder_id === requestingUserId;
  const isVisible = startup.visibility === 'DISCOVERABLE' && startup.status === 'ACTIVE';
  if (!isOwner && !isVisible) {
    return { success: false, error: 'NOT_FOUND' }; // don't leak existence of private startups
  }

  return { success: true, startup, isOwner };
}

async function listMyStartups(founderId) {
  const result = await pool.query('SELECT * FROM startups WHERE founder_id = $1 ORDER BY created_at DESC', [founderId]);
  return { success: true, startups: result.rows };
}

/**
 * Real team-listing endpoint — was genuinely missing (found while wiring
 * the frontend to real data, not previously flagged). Joins team
 * membership with user/profile info so the UI can show actual names,
 * not just user IDs.
 */
async function getTeamMembers(startupId) {
  const result = await pool.query(
    `SELECT stm.id, stm.user_id, stm.role, stm.skills, stm.is_founder, stm.joined_at,
            p.display_name, p.headline
     FROM startup_team_members stm
     JOIN profiles p ON p.user_id = stm.user_id
     WHERE stm.startup_id = $1
     ORDER BY stm.is_founder DESC, stm.joined_at ASC`,
    [startupId]
  );
  return { success: true, members: result.rows };
}

module.exports = { createStartup, analyzeStartup, confirmStartup, getStartup, listMyStartups, getTeamMembers };
