/**
 * AI-14 — Milestone Intelligence Engine.
 * Ref: AI/Intelligence spec §44, SRS §57: "AI-generated milestones must
 * not automatically become immutable startup commitments" — founder
 * retains full control (accept/edit/delete/reorder).
 */
const fs = require('fs');
const path = require('path');
const pool = require('../shared/db');
const { callGroq, parseJsonResponse } = require('../shared/aiClient');

const GROQ_MODEL = 'openai/gpt-oss-120b';
const PROMPT_PATH = path.join(__dirname, '..', '..', 'prompts', 'milestone_generation_v1.md');

function loadPrompt() {
  const raw = fs.readFileSync(PROMPT_PATH, 'utf-8');
  const cutoff = raw.indexOf('## User Input Template');
  return cutoff !== -1 ? raw.slice(0, cutoff).trim() : raw.trim();
}

async function generateMilestones(startupId) {
  const startupResult = await pool.query('SELECT * FROM startups WHERE id = $1', [startupId]);
  if (startupResult.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const startup = startupResult.rows[0];

  const gapsResult = await pool.query('SELECT role, status FROM gaps WHERE startup_id = $1', [startupId]);
  const gapsSummary = gapsResult.rows.map(g => `${g.role} (${g.status})`).join(', ') || 'none diagnosed yet';

  const systemPrompt = loadPrompt();
  const userMessage = `Startup:\nProblem: ${startup.problem}\nSolution: ${startup.solution}\nDomain: ${(startup.domain || []).join(', ')}\nStage: ${startup.stage}\nCurrent known gaps: ${gapsSummary}\n\nReturn the JSON object now.`;

  const callResult = await callGroq(GROQ_MODEL, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ], { response_format: { type: 'json_object' }, temperature: 0.3 });

  if (!callResult.success) return { success: false, error: 'AI_CALL_FAILED', detail: callResult.detail };

  const parseResult = parseJsonResponse(callResult.content);
  if (!parseResult.success) return { success: false, error: 'INVALID_JSON', detail: parseResult.detail, rawResponse: parseResult.rawContent };
  const parsed = parseResult.data;

  if (!Array.isArray(parsed.milestones) || parsed.milestones.length === 0) {
    return { success: false, error: 'SCHEMA_VALIDATION_FAILED', detail: 'milestones must be a non-empty array' };
  }
  for (const m of parsed.milestones) {
    if (typeof m.title !== 'string' || m.title.trim().length === 0) {
      return { success: false, error: 'SCHEMA_VALIDATION_FAILED', detail: 'Each milestone needs a non-empty title' };
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = [];
    for (let idx = 0; idx < parsed.milestones.length; idx++) {
      const m = parsed.milestones[idx];
      const r = await client.query(
        `INSERT INTO milestones (startup_id, title, description, sequence_order, status, source)
         VALUES ($1, $2, $3, $4, 'SUGGESTED', 'AI') RETURNING *`,
        [startupId, m.title, m.description || null, idx + 1]
      );
      inserted.push(r.rows[0]);
    }
    await client.query('COMMIT');
    return { success: true, milestones: inserted };
  } catch (err) {
    await client.query('ROLLBACK');
    return { success: false, error: 'PERSISTENCE_FAILED', detail: err.message };
  } finally {
    client.release();
  }
}

/**
 * SRS §57: founder can accept, edit, delete, reorder. Editing a milestone
 * marks it FOUNDER-sourced from that point on — the AI origin is preserved
 * in history (immutable created_at) but no longer treated as the
 * "current truth" once a human has touched it.
 */
async function updateMilestone(milestoneId, founderId, updates) {
  const ownershipCheck = await pool.query(
    `SELECT m.id FROM milestones m JOIN startups s ON s.id = m.startup_id
     WHERE m.id = $1 AND s.founder_id = $2`,
    [milestoneId, founderId]
  );
  if (ownershipCheck.rows.length === 0) return { success: false, error: 'NOT_FOUND_OR_UNAUTHORIZED' };

  const allowed = ['title', 'description', 'status', 'due_date', 'sequence_order'];
  const fields = Object.keys(updates).filter(k => allowed.includes(k));
  if (fields.length === 0) return { success: false, error: 'NO_VALID_FIELDS' };

  const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => updates[f]);

  const result = await pool.query(
    `UPDATE milestones SET ${setClauses}, source = 'FOUNDER', updated_at = now() WHERE id = $1 RETURNING *`,
    [milestoneId, ...values]
  );
  return { success: true, milestone: result.rows[0] };
}

async function deleteMilestone(milestoneId, founderId) {
  const result = await pool.query(
    `DELETE FROM milestones WHERE id = $1 AND startup_id IN (SELECT id FROM startups WHERE founder_id = $2) RETURNING id`,
    [milestoneId, founderId]
  );
  if (result.rows.length === 0) return { success: false, error: 'NOT_FOUND_OR_UNAUTHORIZED' };
  return { success: true };
}

async function getMilestones(startupId) {
  const result = await pool.query('SELECT * FROM milestones WHERE startup_id = $1 ORDER BY sequence_order', [startupId]);
  return { success: true, milestones: result.rows };
}

module.exports = { generateMilestones, updateMilestone, deleteMilestone, getMilestones };
