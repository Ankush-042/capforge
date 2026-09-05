/**
 * Shared, robust Groq call wrapper (Phase 0 — AI Robustness).
 * Every AI call site in the backend should route through this instead
 * of calling fetch() directly, so retry/fallback behavior is consistent
 * everywhere rather than reimplemented (and potentially forgotten) in
 * each service file separately.
 *
 * Real behaviors enforced here:
 *  - Retries transient failures (network errors, 429, 5xx) up to
 *    MAX_RETRIES times with exponential backoff — a single blip no
 *    longer fails the whole request.
 *  - Does NOT retry non-retryable errors (400 invalid request, 401
 *    auth failure, 404 model not found) — retrying those would just
 *    waste time on something retrying can't fix.
 *  - Returns a consistent { success, content, error, detail } shape
 *    so every caller can handle failure the same way.
 */
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_RETRIES = 2;
const RETRYABLE_STATUS = [429, 500, 502, 503, 504];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callGroq(model, messages, apiKey, options = {}) {
  if (!apiKey) return { success: false, error: 'AI_NOT_CONFIGURED', detail: 'No Groq API key configured.' };

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, ...options })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) return { success: false, error: 'EMPTY_AI_RESPONSE' };
        return { success: true, content };
      }

      const errorText = await res.text();
      if (!RETRYABLE_STATUS.includes(res.status)) {
        // Non-retryable — fail immediately, retrying won't help.
        return { success: false, error: 'AI_CALL_FAILED', detail: `Groq API error ${res.status}: ${errorText}`, status: res.status };
      }
      lastError = `Groq API error ${res.status}: ${errorText}`;
    } catch (err) {
      lastError = err.message; // network-level failure — always retryable
    }

    if (attempt < MAX_RETRIES) {
      await sleep(500 * Math.pow(2, attempt)); // 500ms, 1s, ...
    }
  }

  return { success: false, error: 'AI_CALL_FAILED_AFTER_RETRIES', detail: lastError };
}

/**
 * Parses AI JSON output defensively — models occasionally wrap JSON in
 * markdown code fences or add stray prose despite instructions not to.
 */
function parseJsonResponse(content) {
  const cleaned = content.replace(/```json\s*|```\s*/g, '').trim();
  try {
    return { success: true, data: JSON.parse(cleaned) };
  } catch (err) {
    return { success: false, error: 'MALFORMED_JSON', detail: err.message, rawContent: cleaned.slice(0, 300) };
  }
}

module.exports = { callGroq, parseJsonResponse };
