/**
 * Real fix for a confirmed critical gap: 6 real startups (ClauseIQ,
 * GeneForge, KeyStack, SecureLayer, Streamline, TeamPulse) have never
 * had a readiness assessment run — meaning they're structurally
 * invisible to every investor, regardless of thesis fit, per the
 * MIN_READINESS_FOR_INVESTOR_VISIBILITY gate.
 * Run: node scripts/run-readiness-for-new-startups.js
 */
require('dotenv').config();
const BASE = 'http://localhost:3000/api';
const PASSWORD = 'SeedPass123!';
const FOUNDERS = [
  'founder.securelayer@seed.test', 'founder.keystack@seed.test', 'founder.teampulse@seed.test',
  'founder.streamline@seed.test', 'founder.clauseiq@seed.test', 'founder.geneforge@seed.test'
];

async function post(path, body, token) {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  return res.json();
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('=== Running real readiness assessments for the 6 new startups ===\n');
  for (const email of FOUNDERS) {
    await sleep(8000); // real, safe AI rate-limit spacing
    const login = await post('/auth/login', { email, password: PASSWORD });
    const token = login.token;
    if (!token) { console.log(`  ✗ ${email}: login failed`); continue; }

    const mine = await fetch(`${BASE}/startups/mine`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    const startupId = mine.startups?.[0]?.id;
    if (!startupId) { console.log(`  ✗ ${email}: no startup found`); continue; }

    const result = await post(`/startups/${startupId}/assess`, {}, token);
    if (result.success) console.log(`  ✓ ${mine.startups[0].name}: readiness = ${result.readiness.overall_score}`);
    else console.log(`  ✗ ${mine.startups[0].name}: ${result.error}, ${result.detail}`);
  }
  console.log('\n=== Done. ===');
}
run();
