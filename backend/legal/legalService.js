/**
 * Sprint 27 — Founders-agreement/NDA scaffolding. Ref: PRD §21.
 * MUST NEVER be presented as actual legal advice — enforced via a
 * hardcoded disclaimer prepended server-side, not left to the AI alone.
 */
const fs = require('fs');
const path = require('path');
const pool = require('../shared/db');
const { callGroq } = require('../shared/aiClient');

const GROQ_MODEL = 'openai/gpt-oss-120b';
const PROMPT_PATH = path.join(__dirname, '..', '..', 'prompts', 'legal_scaffolding_v1.md');

const HARDCODED_DISCLAIMER = `⚠️ TEMPLATE ONLY — NOT LEGAL ADVICE. This is a generic starting-point scaffold, not a substitute for a qualified lawyer. Have this reviewed and customized by legal counsel before using it for anything binding.\n\n`;

function loadPrompt() {
  const raw = fs.readFileSync(PROMPT_PATH, 'utf-8');
  const cutoff = raw.indexOf('## User Input Template');
  return cutoff !== -1 ? raw.slice(0, cutoff).trim() : raw.trim();
}

async function generateLegalDocument(startupId, documentType) {
  const startupResult = await pool.query('SELECT * FROM startups WHERE id = $1', [startupId]);
  if (startupResult.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const startup = startupResult.rows[0];

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { success: false, error: 'AI_NOT_CONFIGURED' };

  const systemPrompt = loadPrompt();
  const userMessage = `Document type: ${documentType}\nStartup: ${startup.name}\nContext: ${startup.problem} ${startup.solution}\n\nGenerate the document scaffold now.`;

  const callResult = await callGroq(GROQ_MODEL, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ], apiKey);

  if (!callResult.success) return { success: false, error: 'AI_CALL_FAILED', detail: callResult.detail };
  const content = callResult.content;

  const fullContent = HARDCODED_DISCLAIMER + content;
  const result = await pool.query(
    `INSERT INTO legal_documents (startup_id, document_type, content) VALUES ($1, $2, $3) RETURNING *`,
    [startupId, documentType, fullContent]
  );
  return { success: true, document: result.rows[0] };
}

async function getLegalDocuments(startupId) {
  const result = await pool.query('SELECT * FROM legal_documents WHERE startup_id = $1 ORDER BY generated_at DESC', [startupId]);
  return { success: true, documents: result.rows };
}

module.exports = { generateLegalDocument, getLegalDocuments };
