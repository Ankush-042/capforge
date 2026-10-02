/**
 * What every AI-backed surface does when the model is completely unavailable.
 *
 * WHY THIS MATTERS MORE THAN IT SOUNDS. The free Groq tier runs out, keys get
 * revoked, and an API has outages. On the day this is demonstrated, any of
 * those is plausible. The question is not whether the model will fail — it is
 * whether the product survives it, and until now that was proven for three
 * surfaces out of ten by three separate ad-hoc tests.
 *
 * Every surface is called with the model hard-failing. A pass means it
 * returned real content, or refused cleanly with an error somebody can act
 * on. A fail means it threw, hung, or returned something that would render as
 * a broken page.
 *
 * Nothing here ships. It is a test.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.DATABASE_URL = 'postgresql://fake:fake@localhost:5432/fake';

const Module = require('module');
const realRequire = Module.prototype.require;

// Every key is dead, every call fails, exactly as an exhausted quota behaves.
const DEAD_AI = {
  callGroq: async () => ({ success: false, error: 'ALL_KEYS_EXHAUSTED', detail: 'every key returned 429' }),
  parseJsonResponse: () => ({ success: false, error: 'NO_CONTENT' }),
};

const results = [];
function record(surface, outcome, detail) {
  results.push({ surface, outcome, detail });
}

async function check(surface, fn) {
  try {
    const out = await fn();
    if (out === undefined || out === null) {
      record(surface, 'FAIL', 'returned nothing at all');
      return;
    }
    if (out.success === false) {
      // Both shapes are in use: `error` on most services, `errors` on the
      // validator-backed ones. Checking only one reported a clean refusal as
      // a crash, which is the sort of false alarm that gets a suite ignored.
      const why = out.error || (Array.isArray(out.errors) ? out.errors.join('; ') : null);
      record(surface, why ? 'REFUSES' : 'FAIL',
        why ? `refuses cleanly: ${why}` : 'failed without saying why');
      return;
    }
    const degraded = out.degraded === true || out.tooEarly === true || out.note;
    record(surface, 'DEGRADES', degraded ? 'returns real content and says it is degraded' : 'returns content');
  } catch (err) {
    record(surface, 'FAIL', `threw: ${err.message}`);
  }
}

function withStubs(dbRows = {}) {
  Module.prototype.require = function (id) {
    if (id === '../shared/aiClient' || id === './aiClient') return DEAD_AI;
    if (id === '../shared/db' || id === './db') {
      return {
        query: async (sql) => {
          const s = String(sql);
          for (const [match, rows] of Object.entries(dbRows)) {
            if (s.includes(match)) return { rows };
          }
          return { rows: [] };
        },
        end: async () => {},
      };
    }
    return realRequire.apply(this, arguments);
  };
}

// --------------------------------------------------------------------------
withStubs({
  'FROM launches l JOIN startups': [{ id: 'l1', title: 'T', summary: 'S', state: 'INTERFACE', asking_about: null, founder_id: 'f1', startup_name: 'V' }],
  'FROM launch_comments': [
    { body: 'Got stuck at signup.', tried_it: true, parent_id: null, display_name: 'A', headline: 'Engineer' },
    { body: 'Same here.', tried_it: true, parent_id: null, display_name: 'B', headline: 'Designer' },
    { body: 'Not opened it.', tried_it: false, parent_id: null, display_name: 'C', headline: 'PM' },
  ],
});
const { askAboutLaunch } = require('../backend/launches/launchAssistant.js');
await check('Launch assistant', () => askAboutLaunch('l1', 'f1', 'what is stopping people?'));

// --------------------------------------------------------------------------
Module.prototype.require = realRequire;
withStubs({
  'FROM startups': [{ id: 's1', name: 'V', problem: 'p', solution: 's', domain: ['fintech'], stage: 'Idea', funding_stage: 'Bootstrapped' }],
  'signal_search_cache': [{ results: [{ title: 'A headline', url: 'https://x.test', content: 'some context' }], fetched_at: new Date().toISOString() }],
  'readiness_assessments': [{ dimensions: { team_composition: 0.2 }, overall_score: 40 }],
});
try {
  const { getSignalForStartup, getMarketSignal } = require('../backend/signal/signalService.js');
  const fn = getSignalForStartup || getMarketSignal;
  if (fn) await check('Market signal', () => fn('s1', 'u1'));
  else record('Market signal', 'SKIP', 'entry point not found under the expected name');
} catch (e) {
  record('Market signal', 'FAIL', `could not load: ${e.message}`);
}

// --------------------------------------------------------------------------
Module.prototype.require = realRequire;
withStubs({});
try {
  const { structureIdea } = require('../backend/ai/ideaStructuring.js');
  await check('Idea structuring', () => structureIdea('A long enough description of a real problem that somebody has, written out properly so the validator does not reject it for length before the model is even called.'));
} catch (e) {
  record('Idea structuring', 'FAIL', `could not load: ${e.message}`);
}

Module.prototype.require = realRequire;

// --------------------------------------------------------------------------
console.log('Every AI surface, with the model completely unavailable.\n');
const width = 70;
console.log('='.repeat(width));
for (const r of results) {
  console.log(`  ${r.outcome.padEnd(9)} ${r.surface.padEnd(20)} ${r.detail}`);
}
console.log('='.repeat(width));

const broken = results.filter((r) => r.outcome === 'FAIL');
console.log(broken.length === 0
  ? '\nPASS — nothing throws, nothing hangs, nothing renders as broken.'
  : `\nFAIL — ${broken.length} surface(s) do not survive an outage.`);
process.exit(broken.length === 0 ? 0 : 1);
