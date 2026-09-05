/**
 * AI-04/AI-05 — Gap Diagnosis Engine (the core CapForge intelligence).
 * Ref: AI/Intelligence spec §12-21, TRD §17-21, architecture doc §106 Rule 1/5.
 *
 * DELIBERATELY DETERMINISTIC, NOT LLM-BASED.
 * Per AI spec §63 and architecture doc §55: ranking/scoring must be
 * deterministic and reproducible, not delegated to an LLM. This entire
 * module runs on structured data only — same input always produces the
 * same output, which is what makes gaps auditable and explainable rather
 * than a black box.
 *
 * ALGORITHM (v1, documented so it can be evaluated and improved):
 *  For each role in startup.required_roles:
 *    1. Check if any current team member's role matches (normalized
 *       string comparison) -> if yes, role is FILLED, coverage = 1.0.
 *    2. If no direct role match, compute partial coverage from skill
 *       overlap: (team's combined skills ∩ startup.required_skills) /
 *       required_skills.length. This gives credit when someone on the
 *       team has relevant skills even without the exact title.
 *    3. priority_score = 1 - coverage (a fully uncovered role is
 *       maximally urgent; this is intentionally simple and legible,
 *       not hidden behind unexplainable weights).
 *    4. Map priority_score to a bucket via AI spec §17 thresholds.
 */
const pool = require('../shared/db');

const PRIORITY_THRESHOLDS = [
  { min: 0.80, level: 'CRITICAL' },
  { min: 0.60, level: 'HIGH' },
  { min: 0.40, level: 'MEDIUM' },
  { min: 0.00, level: 'LOW' }
];

function scoreToLevel(score) {
  for (const t of PRIORITY_THRESHOLDS) {
    if (score >= t.min) return t.level;
  }
  return 'LOW';
}

function normalizeRole(role) {
  return role.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

/**
 * Core deterministic diagnosis. Pure function over already-fetched data
 * so it's independently testable without a live DB (TRD §92 unit testing).
 *
 * @param {Array<{role: string, skills: string[]}>} roleRequirements - paired
 *   role->skills requirements from AI structuring (schema v2, migration 004).
 *   This pairing is what makes coverage calculation correct — each role's
 *   coverage is computed ONLY against ITS OWN required skills, never
 *   against another role's skills.
 * @param {Array<{role: string, skills: string[]}>} teamMembers
 */
function diagnoseGaps(roleRequirements, teamMembers) {
  const teamRolesNormalized = teamMembers.map(m => normalizeRole(m.role));
  const teamSkillsCombined = new Set(
    teamMembers.flatMap(m => (m.skills || []).map(s => s.toLowerCase().trim()))
  );

  const gaps = [];

  for (const req of roleRequirements || []) {
    const role = req.role;
    const roleSkills = (req.skills || []).map(s => s.toLowerCase().trim());
    const roleNormalized = normalizeRole(role);
    const directMatch = teamRolesNormalized.includes(roleNormalized);

    let coverage;
    let evidence;

    if (directMatch) {
      coverage = 1.0;
      evidence = {
        match_type: 'direct_role_match',
        matched_against: teamMembers.find(m => normalizeRole(m.role) === roleNormalized).role
      };
    } else if (roleSkills.length > 0) {
      // Overlap computed strictly against THIS role's own skill list —
      // this is the fix: no cross-contamination from unrelated roles.
      const overlap = roleSkills.filter(s => teamSkillsCombined.has(s));
      coverage = overlap.length / roleSkills.length;
      evidence = {
        match_type: 'skill_overlap',
        overlapping_skills: overlap,
        role_specific_skills_considered: roleSkills
      };
    } else {
      coverage = 0;
      evidence = { match_type: 'no_coverage_found' };
    }

    if (!directMatch) coverage = Math.min(coverage, 0.75);

    const priorityScore = Math.round((1 - coverage) * 100) / 100;
    const priorityLevel = scoreToLevel(priorityScore);
    const status = coverage >= 0.95 ? 'FILLED' : coverage >= 0.4 ? 'PARTIALLY_COVERED' : 'OPEN';

    let reason;
    if (directMatch) {
      reason = `Covered — a current team member holds the "${role}" role.`;
    } else if (coverage > 0) {
      reason = `Partially covered — no one holds the "${role}" role directly, but the team's skills overlap ${Math.round(coverage * 100)}% with what this specific role requires.`;
    } else {
      reason = `No current team member covers the "${role}" role, and no overlapping skills relevant to this role were found on the team.`;
    }

    gaps.push({
      role,
      required_skills: roleSkills,
      seeking_type: req.seeking_type || 'CORE_HIRE',
      priority_score: priorityScore,
      priority_level: priorityLevel,
      coverage: Math.round(coverage * 100) / 100,
      reason,
      evidence,
      status
    });
  }

  gaps.sort((a, b) => b.priority_score - a.priority_score);
  return gaps;
}

/**
 * Fetches real startup + team state and persists the diagnosis.
 * Replaces any existing gap rows for this startup (recalculation, TRD §19)
 * rather than accumulating stale duplicates.
 */
async function runGapDiagnosis(startupId) {
  const startupResult = await pool.query('SELECT * FROM startups WHERE id = $1', [startupId]);
  if (startupResult.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const startup = startupResult.rows[0];

  if (!startup.role_requirements || startup.role_requirements.length === 0) {
    return { success: false, error: 'NOT_YET_STRUCTURED', detail: 'Startup has no role_requirements — run AI structuring first.' };
  }

  const teamResult = await pool.query('SELECT role, skills FROM startup_team_members WHERE startup_id = $1', [startupId]);
  const teamMembers = teamResult.rows;

  const gaps = diagnoseGaps(startup.role_requirements, teamMembers);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM gaps WHERE startup_id = $1', [startupId]);

    const inserted = [];
    for (const g of gaps) {
      const r = await client.query(
        `INSERT INTO gaps (startup_id, role, required_skills, seeking_type, priority_score, priority_level, coverage, reason, evidence, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [startupId, g.role, g.required_skills, g.seeking_type, g.priority_score, g.priority_level, g.coverage, g.reason, JSON.stringify(g.evidence), g.status]
      );
      inserted.push(r.rows[0]);
    }
    await client.query('COMMIT');
    return { success: true, gaps: inserted };
  } catch (err) {
    await client.query('ROLLBACK');
    return { success: false, error: 'DIAGNOSIS_PERSISTENCE_FAILED', detail: err.message };
  } finally {
    client.release();
  }
}

async function getGaps(startupId) {
  const result = await pool.query(
    'SELECT * FROM gaps WHERE startup_id = $1 ORDER BY priority_score DESC',
    [startupId]
  );
  return { success: true, gaps: result.rows };
}

module.exports = { diagnoseGaps, runGapDiagnosis, getGaps, normalizeRole, scoreToLevel };
