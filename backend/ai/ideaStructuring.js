/**
 * AI-01 — Idea Structuring Engine
 * Converts a founder's raw startup idea into a structured, schema-validated
 * venture representation using Gemini.
 *
 * Spec reference: TRD §15, AI/Intelligence spec §6-9, §53 (validation pipeline)
 *
 * Design principles enforced here (non-negotiable per AI spec §86):
 *  - No fake AI output: real API call, real response, real validation.
 *  - No silent mixing of confirmed facts and AI inference (confidence field).
 *  - Malformed/invalid model output must be rejected, never persisted as-is.
 *  - AI failure must not throw away the founder's original input.
 */

const fs = require('fs');
const path = require('path');

const GEMINI_MODEL = 'gemini-3.5-flash-lite'; // GA model, recommended for extraction/classification tasks
const GEMINI_ENDPOINT = (apiKey) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

const PROMPT_TEMPLATE_PATH = path.join(__dirname, '..', '..', 'prompts', 'idea_structuring_v1.md');

const REQUIRED_FIELDS = [
  'problem', 'solution', 'target_users', 'domain', 'business_model',
  'stage', 'required_roles', 'required_skills', 'technology_requirements',
  'risks', 'confidence', 'clarification_needed'
];

const VALID_STAGES = ['Idea', 'Prototype', 'MVP', 'Early Traction', 'Unclear'];
const VALID_CONFIDENCE = ['high', 'medium', 'low'];

/**
 * Loads the system instruction portion of the prompt template
 * (everything between "## System Instruction" and "## Output Schema"
 * plus the schema itself — Gemini gets the full spec, not just a summary).
 */
function loadPromptTemplate() {
  const raw = fs.readFileSync(PROMPT_TEMPLATE_PATH, 'utf-8');
  // Strip the User Input Template section — that gets built per-call.
  const cutoff = raw.indexOf('## User Input Template');
  return cutoff !== -1 ? raw.slice(0, cutoff).trim() : raw.trim();
}

/**
 * Validates a parsed AI response against the required schema.
 * Returns { valid: boolean, errors: string[] }
 */
function validateStructuredOutput(obj) {
  const errors = [];

  if (typeof obj !== 'object' || obj === null) {
    return { valid: false, errors: ['Response is not a JSON object'] };
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in obj)) errors.push(`Missing required field: ${field}`);
  }

  if (obj.stage && !VALID_STAGES.includes(obj.stage)) {
    errors.push(`Invalid stage value: ${obj.stage}`);
  }

  if (obj.confidence) {
    for (const k of ['problem', 'solution', 'domain', 'required_roles']) {
      if (obj.confidence[k] && !VALID_CONFIDENCE.includes(obj.confidence[k])) {
        errors.push(`Invalid confidence value for ${k}: ${obj.confidence[k]}`);
      }
    }
  }

  const arrayFields = ['target_users', 'domain', 'business_model', 'required_roles',
                        'required_skills', 'technology_requirements', 'risks', 'clarification_needed'];
  for (const field of arrayFields) {
    if (obj[field] !== undefined && !Array.isArray(obj[field])) {
      errors.push(`Field ${field} should be an array, got ${typeof obj[field]}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calls Gemini to structure a raw idea. Does NOT persist anything —
 * that's the caller's job (per architecture: this module is pure AI orchestration).
 *
 * @param {string} rawIdea - the founder's raw text input
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<{success: boolean, data?: object, errors?: string[], rawResponse?: string}>}
 */
async function structureIdea(rawIdea, apiKey) {
  if (!rawIdea || typeof rawIdea !== 'string' || rawIdea.trim().length < 5) {
    return { success: false, errors: ['Raw idea input is empty or too short'] };
  }

  const systemPrompt = loadPromptTemplate();
  const fullPrompt = `${systemPrompt}\n\n## User Input\n\nRaw idea:\n"""\n${rawIdea.trim()}\n"""\n\nReturn the JSON object now.`;

  let apiResponse;
  try {
    const res = await fetch(GEMINI_ENDPOINT(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, errors: [`Gemini API error ${res.status}: ${errText}`] };
    }

    apiResponse = await res.json();
  } catch (err) {
    return { success: false, errors: [`Network/request failure: ${err.message}`] };
  }

  const textOutput = apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    return { success: false, errors: ['No text output in Gemini response'], rawResponse: JSON.stringify(apiResponse) };
  }

  let parsed;
  try {
    parsed = JSON.parse(textOutput);
  } catch (err) {
    return { success: false, errors: [`Response was not valid JSON: ${err.message}`], rawResponse: textOutput };
  }

  const validation = validateStructuredOutput(parsed);
  if (!validation.valid) {
    return { success: false, errors: validation.errors, rawResponse: textOutput, data: parsed };
  }

  return { success: true, data: parsed };
}

module.exports = { structureIdea, validateStructuredOutput, loadPromptTemplate };
