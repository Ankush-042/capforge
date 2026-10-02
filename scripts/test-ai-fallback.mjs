/**
 * Does the fallback change anything when it should not?
 *
 * The entire case for this feature is that it cannot affect a working
 * install. That claim has to be proven rather than asserted, so these are the
 * three cases that matter and the first two are the important ones.
 */
process.env.DATABASE_URL = 'postgresql://fake:fake@localhost:5432/fake';
const { createRequire } = await import('module');
const require = createRequire(import.meta.url);

const realFetch = global.fetch;
const calls = [];

function stubFetch({ groqOk, fallbackOk }) {
  global.fetch = async (url, opts) => {
    const u = String(url);
    calls.push(u.includes('groq.com') ? 'groq' : 'fallback');
    const ok = u.includes('groq.com') ? groqOk : fallbackOk;
    if (!ok) return { ok: false, status: 429, text: async () => 'rate limited' };
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: u.includes('groq.com') ? 'from groq' : 'from fallback' } }] }),
    };
  };
}

function reset(env) {
  for (const k of ['FALLBACK_API_KEY', 'FALLBACK_BASE_URL', 'FALLBACK_MODEL']) delete process.env[k];
  Object.assign(process.env, env);
  calls.length = 0;
  for (const k of Object.keys(require.cache)) delete require.cache[k];
}

const results = [];

// 1. Groq works, fallback configured. The fallback must never be touched.
reset({ GROQ_API_KEY: 'k1', FALLBACK_API_KEY: 'f1', FALLBACK_BASE_URL: 'https://fallback.test/v1' });
stubFetch({ groqOk: true, fallbackOk: true });
let { callGroq } = require('../backend/shared/aiClient.js');
let r = await callGroq('m', [{ role: 'user', content: 'x' }]);
results.push([
  'a working key is answered by Groq and the fallback is never called',
  r.success && r.content === 'from groq' && !calls.includes('fallback'),
]);

// 2. Groq fails, NO fallback configured. Must behave exactly as before.
reset({ GROQ_API_KEY: 'k1' });
stubFetch({ groqOk: false, fallbackOk: true });
({ callGroq } = require('../backend/shared/aiClient.js'));
r = await callGroq('m', [{ role: 'user', content: 'x' }]);
results.push([
  'with no fallback configured the original failure is returned unchanged',
  r.success === false && r.error === 'ALL_KEYS_EXHAUSTED' && !calls.includes('fallback'),
]);

// 3. Groq fails, fallback configured. Only now should it run.
reset({ GROQ_API_KEY: 'k1', FALLBACK_API_KEY: 'f1', FALLBACK_BASE_URL: 'https://fallback.test/v1' });
stubFetch({ groqOk: false, fallbackOk: true });
({ callGroq } = require('../backend/shared/aiClient.js'));
r = await callGroq('m', [{ role: 'user', content: 'x' }]);
results.push([
  'when every key has failed the fallback answers',
  r.success === true && r.content === 'from fallback' && r.viaFallback === true,
]);

// 4. Both fail. Must refuse cleanly rather than throw.
reset({ GROQ_API_KEY: 'k1', FALLBACK_API_KEY: 'f1', FALLBACK_BASE_URL: 'https://fallback.test/v1' });
stubFetch({ groqOk: false, fallbackOk: false });
({ callGroq } = require('../backend/shared/aiClient.js'));
r = await callGroq('m', [{ role: 'user', content: 'x' }]);
results.push([
  'if the fallback also fails it refuses cleanly instead of throwing',
  r.success === false && r.error === 'ALL_KEYS_EXHAUSTED',
]);

global.fetch = realFetch;

let ok = true;
for (const [name, pass] of results) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (!pass) ok = false;
}
console.log('\n' + (ok
  ? 'PASS — invisible when things work, and only ever turns nothing into something.'
  : 'FAIL — the fallback affects a path it must not touch.'));
process.exit(ok ? 0 : 1);
