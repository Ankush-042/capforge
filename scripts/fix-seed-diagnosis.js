/**
 * Fix for a real bug found in seed-ecosystem.js: it called diagnose/assess
 * but never checked their actual success before printing a checkmark.
 * This script logs into the 6 already-created founder accounts and
 * re-runs diagnose + assess with REAL result checking, to find and fix
 * the actual cause of zero gaps.
 */
const BASE = 'http://localhost:3000/api';
const PASSWORD = 'SeedPass123!';
const FOUNDER_EMAILS = [
  'founder.neura@seed.test', 'founder.ecocharge@seed.test', 'founder.learnloop@seed.test',
  'founder.paybridge@seed.test', 'founder.logichain@seed.test', 'founder.climatelens@seed.test',
];

async function login(email) {
  const res = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) });
  const data = await res.json();
  return data.success ? data.token : null;
}

async function run() {
  for (const email of FOUNDER_EMAILS) {
    const token = await login(email);
    if (!token) { console.log(`✗ ${email}: login failed`); continue; }

    const startupsRes = await fetch(`${BASE}/startups/mine`, { headers: { Authorization: `Bearer ${token}` } });
    const startupsData = await startupsRes.json();
    const startup = startupsData.startups?.[0];
    if (!startup) { console.log(`✗ ${email}: no startup found`); continue; }

    console.log(`\n--- ${startup.name} ---`);
    console.log(`role_requirements: ${JSON.stringify(startup.role_requirements)}`);
    console.log(`status: ${startup.status}, founder_confirmed: ${startup.founder_confirmed}`);

    const analyzeRes = await fetch(`${BASE}/startups/${startup.id}/analyze`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const analyzeData = await analyzeRes.json();
    console.log(`analyze result: success=${analyzeData.success}, error=${analyzeData.error || 'none'}, detail=${JSON.stringify(analyzeData.detail) || 'none'}`);
    if (!analyzeData.success) continue;

    const confirmRes = await fetch(`${BASE}/startups/${startup.id}/confirm`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{}' });
    console.log(`confirm result: ${(await confirmRes.json()).success}`);

    const diagRes = await fetch(`${BASE}/startups/${startup.id}/diagnose`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const diagData = await diagRes.json();
    console.log(`diagnose result: success=${diagData.success}, gaps=${diagData.gaps?.length}, error=${diagData.error || 'none'}, detail=${diagData.detail || 'none'}`);

    const assessRes = await fetch(`${BASE}/startups/${startup.id}/assess`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const assessData = await assessRes.json();
    console.log(`assess result: success=${assessData.success}, error=${assessData.error || 'none'}`);
  }
}
run();
