/**
 * AI-01 — Idea Structuring Engine
 * Converts a founder's raw startup idea into a structured, schema-validated
 * venture representation using an LLM (Groq — OpenAI-compatible endpoint).
 *
 * Spec reference: TRD §15, AI/Intelligence spec §6-9, §53 (validation pipeline)
 * Provider: Groq (chosen for free-tier reliability — see AI orchestration
 * design note below; swapping providers is a config change, not a rewrite,
 * per TRD §8's requirement that the LLM layer stay swappable).
 *
 * Design principles enforced here (non-negotiable per AI spec §86):
 *  - No fake AI output: real API call, real response, real validation.
 *  - No silent mixing of confirmed facts and AI inference (confidence field).
 *  - Malformed/invalid model output must be rejected, never persisted as-is.
 *  - AI failure must not throw away the founder's original input.
 */

const fs = require('fs');
const path = require('path');
const { callGroq, parseJsonResponse } = require('../shared/aiClient');

const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const PROMPT_TEMPLATE_PATH = path.join(__dirname, '..', '..', 'prompts', 'idea_structuring_v1.md');

const REQUIRED_FIELDS = [
  'problem', 'solution', 'target_users', 'domain', 'business_model',
  'stage', 'role_requirements', 'technology_requirements',
  'risks', 'confidence', 'clarification_needed'
];

const VALID_STAGES = ['Idea', 'Prototype', 'MVP', 'Early Traction', 'Unclear'];
const VALID_CONFIDENCE = ['high', 'medium', 'low'];

/**
 * Loads the system instruction portion of the prompt template
 * (everything between "## System Instruction" and "## Output Schema"
 * plus the schema itself — the model gets the full spec, not just a summary).
 */
function loadPromptTemplate() {
  const raw = fs.readFileSync(PROMPT_TEMPLATE_PATH, 'utf-8');
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
    for (const k of ['problem', 'solution', 'domain', 'role_requirements']) {
      if (obj.confidence[k] && !VALID_CONFIDENCE.includes(obj.confidence[k])) {
        errors.push(`Invalid confidence value for ${k}: ${obj.confidence[k]}`);
      }
    }
  }

  if (obj.role_requirements !== undefined) {
    if (!Array.isArray(obj.role_requirements)) {
      errors.push('role_requirements must be an array');
    } else {
      obj.role_requirements.forEach((r, i) => {
        if (typeof r !== 'object' || r === null) {
          errors.push(`role_requirements[${i}] is not an object`);
        } else {
          if (typeof r.role !== 'string' || r.role.trim().length === 0) {
            errors.push(`role_requirements[${i}].role must be a non-empty string`);
          }
          if (!Array.isArray(r.skills)) {
            errors.push(`role_requirements[${i}].skills must be an array`);
          }
        }
      });
    }
  }

  const arrayFields = ['target_users', 'domain', 'business_model',
                        'technology_requirements', 'risks', 'clarification_needed'];
  for (const field of arrayFields) {
    if (obj[field] !== undefined && !Array.isArray(obj[field])) {
      errors.push(`Field ${field} should be an array, got ${typeof obj[field]}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calls the LLM to structure a raw idea. Does NOT persist anything —
 * that's the caller's job (this module is pure AI orchestration).
 *
 * @param {string} rawIdea - the founder's raw text input
 * @param {string} apiKey - Groq API key
 * @returns {Promise<{success: boolean, data?: object, errors?: string[], rawResponse?: string}>}
 */
async function structureIdea(rawIdea, apiKey) {
  if (!rawIdea || typeof rawIdea !== 'string' || rawIdea.trim().length < 5) {
    return { success: false, errors: ['Raw idea input is empty or too short'] };
  }

  const systemPrompt = loadPromptTemplate();
  const userMessage = `Raw idea:\n"""\n${rawIdea.trim()}\n"""\n\nReturn the JSON object now.`;

  const callResult = await callGroq(GROQ_MODEL, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ], apiKey, { response_format: { type: 'json_object' }, temperature: 0.2 });

  if (!callResult.success) {
    return { success: false, errors: [callResult.detail || callResult.error] };
  }

  let parseResult = parseJsonResponse(callResult.content);

  // Phase 0 robustness: if the model's output isn't valid JSON despite
  // response_format instructing it to be, retry ONCE with an explicit
  // correction prompt rather than failing outright on a fixable mistake.
  if (!parseResult.success) {
    const retryResult = await callGroq(GROQ_MODEL, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
      { role: 'assistant', content: callResult.content },
      { role: 'user', content: 'That was not valid JSON. Return ONLY the raw JSON object, no markdown formatting, no extra text.' }
    ], apiKey, { response_format: { type: 'json_object' }, temperature: 0.1 });

    if (!retryResult.success) return { success: false, errors: [retryResult.detail || retryResult.error] };
    parseResult = parseJsonResponse(retryResult.content);
    if (!parseResult.success) {
      return { success: false, errors: [`Response was not valid JSON even after correction retry: ${parseResult.detail}`], rawResponse: parseResult.rawContent };
    }
  }

  const parsed = parseResult.data;
  const validation = validateStructuredOutput(parsed);
  if (!validation.valid) {
    return { success: false, errors: validation.errors, rawResponse: JSON.stringify(parsed), data: parsed };
  }

  // Real bug found via baseline-benchmark.js and consistency-tests.js:
  // the model occasionally returns an empty role_requirements array even
  // for ventures that clearly need roles to be built (e.g. a payments
  // platform with no stated team). Schema validation alone can't catch
  // this — an empty array is technically valid. Retry ONCE with an
  // explicit correction before accepting it, since this directly
  // undermines gap diagnosis (nothing to diagnose against).
  if (Array.isArray(parsed.role_requirements) && parsed.role_requirements.length === 0) {
    const retryResult = await callGroq(GROQ_MODEL, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
      { role: 'assistant', content: JSON.stringify(parsed) },
      { role: 'user', content: 'role_requirements was empty. Every venture needs roles to be built, even if the founder did not explicitly ask for help — infer them from what the venture DOES (e.g. a payments platform needs backend/compliance/infrastructure roles). Return the corrected JSON object now, with at least the core roles this venture would need to exist.' }
    ], apiKey, { response_format: { type: 'json_object' }, temperature: 0.2 });

    if (retryResult.success) {
      const retryParse = parseJsonResponse(retryResult.content);
      if (retryParse.success) {
        const retryValidation = validateStructuredOutput(retryParse.data);
        if (retryValidation.valid && Array.isArray(retryParse.data.role_requirements) && retryParse.data.role_requirements.length > 0) {
          return { success: true, data: retryParse.data };
        }
      }
    }
    // Retry didn't produce a better result — proceed with the original,
    // honestly empty output rather than silently failing the whole request.
  }

  return { success: true, data: parsed };
}

module.exports = { structureIdea, validateStructuredOutput, loadPromptTemplate };
