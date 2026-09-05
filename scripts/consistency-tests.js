/**
 * Phase 5 — Objective 4's literal completion criterion: "Repeat-run
 * agreement measured on a fixed test set; diagnosis does not drift
 * across identical inputs." This tests the ONE genuinely non-
 * deterministic step in the critical path — AI idea structuring.
 * (Gap diagnosis and readiness scoring are pure functions of already-
 * structured data — given identical DB state, they are exact-match
 * consistent by construction, not worth testing for "drift".)
 *
 * Directly checks for the over-prediction/instability bias the
 * project's own literature review found in baseline zero-shot LLMs
 * (Wang, Ihlamur & Alican — 21.28% precision at 100% recall).
 *
 * Run: node scripts/consistency-tests.js
 */
const BASE = 'http://localhost:3000/api';
const RUNS_PER_IDEA = 3;
const PASSWORD = 'ConsistTest123!';

// Fixed test set — same 3 ideas across every run.
const TEST_IDEAS = [
  { name: 'ConsistTest-Health', idea: 'An AI diagnostic assistant that helps rural clinics screen for common conditions using smartphone-captured images and basic vitals, flagging cases that need urgent referral.' },
  { name: 'ConsistTest-Fintech', idea: 'A cross-border payment platform for freelancers in emerging markets to receive USD/EUR payments and convert to local currency with minimal fees.' },
  { name: 'ConsistTest-EdTech', idea: 'An adaptive learning platform for high school math that adjusts difficulty in real time based on how a student solves problems, not just whether they get them right.' },
];

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

function jaccardSimilarity(a, b) {
  const setA = new Set(a.map(x => x.toLowerCase().trim()));
  const setB = new Set(b.map(x => x.toLowerCase().trim()));
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 1 : intersection / union;
}

async function runConsistencyTest(testIdea, runIndex) {
  const email = `consist-${testIdea.name}-${runIndex}-${Date.now()}@test.internal`;
  const reg = await post('/auth/register', { email, password: PASSWORD, primaryRole: 'FOUNDER', displayName: 'Consistency Test' });
  if (!reg.ok) return null;
  const token = reg.data.token;

  const create = await post('/startups', { name: `${testIdea.name}-${runIndex}`, rawIdea: testIdea.idea }, token);
  if (!create.ok || !create.data.success) return null;
  return create.data.startup;
}

async function run() {
  console.log('=== Objective 4: Repeat-Run Consistency Test ===');
  console.log(`${TEST_IDEAS.length} fixed test ideas, ${RUNS_PER_IDEA} runs each, same raw text every time.\n`);

  const allResults = [];

  for (const testIdea of TEST_IDEAS) {
    console.log(`--- ${testIdea.name} ---`);
    const runs = [];
    for (let i = 1; i <= RUNS_PER_IDEA; i++) {
      const startup = await runConsistencyTest(testIdea, i);
      if (startup) runs.push(startup);
    }

    if (runs.length < 2) { console.log('  Insufficient successful runs to compare.\n'); continue; }

    // Stage agreement: do all runs classify the same stage?
    const stages = runs.map(r => r.stage);
    const stageAgreement = stages.every(s => s === stages[0]);
    console.log(`  Stage classification across ${runs.length} runs: [${stages.join(', ')}] — ${stageAgreement ? 'CONSISTENT' : 'DRIFTED'}`);

    // Domain overlap: Jaccard similarity between run 1 and each other run.
    const domainSimilarities = runs.slice(1).map(r => jaccardSimilarity(runs[0].domain || [], r.domain || []));
    const avgDomainSimilarity = domainSimilarities.reduce((a, b) => a + b, 0) / domainSimilarities.length;
    console.log(`  Domain tag overlap (Jaccard, vs run 1): ${(avgDomainSimilarity * 100).toFixed(0)}% average`);

    // Role count consistency: how much does the number of identified roles vary?
    const roleCounts = runs.map(r => (r.role_requirements || []).length);
    const roleCountRange = Math.max(...roleCounts) - Math.min(...roleCounts);
    console.log(`  Role count across runs: [${roleCounts.join(', ')}] — range: ${roleCountRange}`);

    allResults.push({ name: testIdea.name, stageAgreement, avgDomainSimilarity, roleCountRange });
  }

  console.log('\n=== Summary ===');
  const stageAgreementRate = allResults.filter(r => r.stageAgreement).length / allResults.length;
  const avgDomainOverlap = allResults.reduce((sum, r) => sum + r.avgDomainSimilarity, 0) / allResults.length;
  console.log(`Stage classification agreement: ${(stageAgreementRate * 100).toFixed(0)}% of test ideas`);
  console.log(`Average domain tag overlap: ${(avgDomainOverlap * 100).toFixed(0)}%`);
  console.log('\nNote: gap diagnosis and readiness scoring are pure functions of');
  console.log('already-structured data — given identical inputs, they are exact-match');
  console.log('consistent by construction (deterministic code, not an LLM call).');
  console.log('This test targets the one genuinely AI-driven, non-deterministic step.');
}

run();
