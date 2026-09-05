/**
 * Shared, robust Groq call wrapper — now with real multi-key automatic
 * failover (added after hitting a real free-tier quota limit during
 * testing). Supports GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3 (any
 * number, add more the same way) — set as many as you have in .env.
 *
 * Real behaviors enforced here:
 *  - Retries transient failures (network errors, 5xx) on the SAME key
 *    up to MAX_RETRIES times with exponential backoff.
 *  - On a 429 (rate limit / quota exhausted) or 401 (invalid/revoked
 *    key), immediately rotates to the NEXT configured key and retries
 *    there — a single key running out no longer breaks anything as
 *    long as at least one other configured key still has quota.
 *  - Only fails outright once EVERY configured key has been tried and
 *    exhausted.
 *  - Returns a consistent { success, content, error, detail } shape.
 */
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_RETRIES = 2;
const RETRYABLE_STATUS = [500, 502, 503, 504]; // transient — retry same key
const ROTATE_STATUS = [429, 401]; // quota/auth — rotate to next key immediately

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Reads all configured keys fresh each call (not cached at module load)
 * so a key added to .env mid-session is picked up without a restart
 * being strictly required for NEW process starts — still needs a
 * restart to reload .env itself, but the lookup logic here is correct
 * either way and doesn't hardcode a fixed list length.
 */
function getConfiguredKeys() {
  const keys = [];
  if (process.env.GROQ_API_KEY) keys.push(process.env.GROQ_API_KEY);
  let i = 2;
  while (process.env[`GROQ_API_KEY_${i}`]) {
    keys.push(process.env[`GROQ_API_KEY_${i}`]);
    i++;
  }
  return keys;
}

async function callGroqWithKey(model, messages, apiKey, options) {
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
        if (!content) return { outcome: 'FAIL', error: 'EMPTY_AI_RESPONSE' };
        return { outcome: 'SUCCESS', content };
      }

      const errorText = await res.text();
      if (ROTATE_STATUS.includes(res.status)) {
        return { outcome: 'ROTATE', detail: `Groq API error ${res.status}: ${errorText}`, status: res.status };
      }
      if (!RETRYABLE_STATUS.includes(res.status)) {
        return { outcome: 'FAIL', error: 'AI_CALL_FAILED', detail: `Groq API error ${res.status}: ${errorText}`, status: res.status };
      }
      lastError = `Groq API error ${res.status}: ${errorText}`;
    } catch (err) {
      lastError = err.message;
    }

    if (attempt < MAX_RETRIES) await sleep(500 * Math.pow(2, attempt));
  }

  return { outcome: 'FAIL', error: 'AI_CALL_FAILED_AFTER_RETRIES', detail: lastError };
}

async function callGroq(model, messages, options = {}) {
  const keys = getConfiguredKeys();
  if (keys.length === 0) return { success: false, error: 'AI_NOT_CONFIGURED', detail: 'No Groq API key configured (set GROQ_API_KEY in .env).' };

  let lastRotateDetail = null;

  for (let i = 0; i < keys.length; i++) {
    const result = await callGroqWithKey(model, messages, keys[i], options);

    if (result.outcome === 'SUCCESS') return { success: true, content: result.content };
    if (result.outcome === 'FAIL') return { success: false, error: result.error, detail: result.detail };

    // outcome === 'ROTATE': this key is out of quota or invalid — try the next one.
    lastRotateDetail = result.detail;
    console.error(`Groq key ${i + 1}/${keys.length} exhausted/invalid (${result.status}) — rotating to next key.`);
  }

  return { success: false, error: 'ALL_KEYS_EXHAUSTED', detail: `All ${keys.length} configured Groq key(s) failed. Last: ${lastRotateDetail}` };
}

function parseJsonResponse(content) {
  const cleaned = content.replace(/```json\s*|```\s*/g, '').trim();
  try {
    return { success: true, data: JSON.parse(cleaned) };
  } catch (err) {
    return { success: false, error: 'MALFORMED_JSON', detail: err.message, rawContent: cleaned.slice(0, 300) };
  }
}

module.exports = { callGroq, parseJsonResponse, getConfiguredKeys };
