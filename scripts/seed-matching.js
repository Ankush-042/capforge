/**
 * Sprint D — Phase 2 of seeding: run REAL matching across the whole
 * ecosystem, so Contributor and Investor dashboards have real
 * recommendations to show immediately, instead of being empty until
 * someone manually clicks "rank candidates" on every single gap.
 *
 * Run AFTER scripts/seed-ecosystem.js has completed successfully.
 * Run: node scripts/seed-matching.js
 */

const BASE = 'http://localhost:3000/api';
const PASSWORD = 'SeedPass123!';

const FOUNDER_EMAILS = [
  'founder.neura@seed.test', 'founder.ecocharge@seed.test', 'founder.learnloop@seed.test',
  'founder.paybridge@seed.test', 'founder.logichain@seed.test', 'founder.climatelens@seed.test',
];
const INVESTOR_EMAILS = ['i.raj@seed.test', 'i.meridian@seed.test', 'i.greenseed@seed.test', 'i.nextwave@seed.test'];

async function login(email) {
  const res = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) });
  const data = await res.json();
  return data.success ? data.token : null;
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function run() {
  console.log('=== Ranking real candidates for every open gap, across every founder ===');
  for (const email of FOUNDER_EMAILS) {
    await sleep(500);
    const token = await login(email);
    if (!token) { console.log(`  ✗ ${email}: login failed`); continue; }

    const startupsRes = await fetch(`${BASE}/startups/mine`, { headers: { Authorization: `Bearer ${token}` } });
    const startupsData = await startupsRes.json();
    if (!startupsData.success || startupsData.startups.length === 0) {
      console.log(`  ✗ ${email}: no startups found — success=${startupsData.success}, count=${startupsData.startups?.length}, raw=${JSON.stringify(startupsData).slice(0, 150)}`);
      continue;
    }
    const startup = startupsData.startups[0];

    const gapsRes = await fetch(`${BASE}/startups/${startup.id}/gaps`, { headers: { Authorization: `Bearer ${token}` } });
    const gapsData = await gapsRes.json();
    if (!gapsData.success) {
      console.log(`  ✗ ${startup.name}: gap fetch failed — ${JSON.stringify(gapsData).slice(0, 150)}`);
      continue;
    }
    if (gapsData.gaps.length === 0) {
      console.log(`  ⚠ ${startup.name}: zero gaps found (was diagnosis run during seeding?)`);
      continue;
    }

    for (const gap of gapsData.gaps) {
      if (gap.status === 'FILLED') continue;
      const rankRes = await fetch(`${BASE}/gaps/${gap.id}/rank-candidates`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const rankData = await rankRes.json();
      console.log(`  ${rankData.success ? '✓' : '✗'} ${startup.name} — ${gap.role}: ${rankData.recommendations?.length || 0} candidates ranked`);
      await sleep(200);
    }
  }

  console.log('\n=== Refreshing deal-flow for every investor ===');
  for (const email of INVESTOR_EMAILS) {
    await sleep(500);
    const token = await login(email);
    if (!token) { console.log(`  ✗ ${email}: login failed`); continue; }
    const res = await fetch(`${BASE}/investors/recommendations/refresh`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    console.log(`  ${data.success ? '✓' : '✗'} ${email}: ${data.recommendations?.length || 0} startups ranked`);
  }

  console.log('\n=== Done. Contributor and Investor dashboards now have real recommendations. ===');
}

run();
