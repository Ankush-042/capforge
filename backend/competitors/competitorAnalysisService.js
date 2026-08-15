/**
 * AI-13 — Competitor / Positioning Engine.
 * Ref: AI/Intelligence spec §42-43, PRD §16, SRS §52-53.
 *
 * Same validated-AI-call discipline as ideaStructuring.js (Sprint 0):
 * schema-validated output, never blindly persisted, source explicitly
 * marked AI_INTERPRETED so the UI can never present this as verified fact.
 */
const fs = require('fs');
const path = require('path');
const pool = require('../shared/db');

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const PROMPT_PATH = path.join(__dirname, '..', '..', 'prompts', 'competitor_analysis_v1.md');

function loadPrompt() {
  const raw = fs.readFileSync(PROMPT_PATH, 'utf-8');
  const cutoff = raw.indexOf('## User Input Template');
  return cutoff !== -1 ? raw.slice(0, cutoff).trim() : raw.trim();
}

function validate(obj) {
  const required = ['comparable_category', 'comparable_players', 'potential_overlap', 'differentiation_opportunities', 'positioning_questions'];
  const errors = required.filter(f => !(f in obj)).map(f => `Missing field: ${f}`);
  if (obj.comparable_players && !Array.isArray(obj.comparable_players)) errors.push('comparable_players must be an array');
  if (obj.differentiation_opportunities && !Array.isArray(obj.differentiation_opportunities)) errors.push('differentiation_opportunities must be an array');
  if (obj.positioning_questions && !Array.isArray(obj.positioning_questions)) errors.push('positioning_questions must be an array');
  return { valid: errors.length === 0, errors };
}

async function runCompetitorAnalysis(startupId) {
  const startupResult = await pool.query('SELECT * FROM startups WHERE id = $1', [startupId]);
  if (startupResult.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const startup = startupResult.rows[0];

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { success: false, error: 'AI_NOT_CONFIGURED' };

  const systemPrompt = loadPrompt();
  const userMessage = `Startup:\nProblem: ${startup.problem}\nSolution: ${startup.solution}\nDomain: ${(startup.domain || []).join(', ')}\nStage: ${startup.stage}\n\nReturn the JSON object now.`;

  let apiResponse;
  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
        response_format: { type: 'json_object' },
        temperature: 0.2
      })
    });
    if (!res.ok) return { success: false, error: 'AI_CALL_FAILED', detail: `${res.status}: ${await res.text()}` };
    apiResponse = await res.json();
  } catch (err) {
    return { success: false, error: 'NETWORK_FAILURE', detail: err.message };
  }

  const textOutput = apiResponse?.choices?.[0]?.message?.content;
  if (!textOutput) return { success: false, error: 'EMPTY_AI_RESPONSE' };

  let parsed;
  try {
    parsed = JSON.parse(textOutput);
  } catch (err) {
    return { success: false, error: 'INVALID_JSON', detail: err.message, rawResponse: textOutput };
  }

  const validation = validate(parsed);
  if (!validation.valid) return { success: false, error: 'SCHEMA_VALIDATION_FAILED', detail: validation.errors };

  const result = await pool.query(
    `INSERT INTO competitors (startup_id, comparable_category, comparable_players, potential_overlap, differentiation_opportunities, positioning_questions)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [startupId, parsed.comparable_category, parsed.comparable_players, parsed.potential_overlap, parsed.differentiation_opportunities, parsed.positioning_questions]
  );

  return { success: true, competitorAnalysis: result.rows[0] };
}

async function getCompetitorAnalyses(startupId) {
  const result = await pool.query('SELECT * FROM competitors WHERE startup_id = $1 ORDER BY created_at DESC', [startupId]);
  return { success: true, analyses: result.rows };
}

module.exports = { runCompetitorAnalysis, getCompetitorAnalyses };
