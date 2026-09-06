/**
 * Real fix for confirmed stale data: every seeded startup's readiness
 * was computed BEFORE the Phase 1 dimension rebuild (old 7-dimension
 * model frozen in the database). getLatestReadiness() just reads the
 * most recent stored row — pulling new code does nothing to already-
 * stored assessments; only a fresh /assess call recomputes it.
 *
 * Logs in as each real founder account individually and re-assesses
 * their own startup with their own real token — /assess correctly
 * enforces ownership (confirmed real security behavior, not bypassed
 * here), so this respects that rather than working around it.
 *
 * Run: node scripts/reassess-all-startups.js
 */
const BASE = 'http://localhost:3000/api';
const PASSWORD = 'SeedPass123!';
const FOUNDER_EMAILS = [
  'founder.neura@seed.test', 'founder.ecocharge@seed.test', 'founder.learnloop@seed.test',
  'founder.paybridge@seed.test', 'founder.logichain@seed.test', 'founder.climatelens@seed.test',
  'test@test.com', // original manual test account, different password
];
const KNOWN_PASSWORDS = { 'test@test.com': 'testpass123' };

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const data = await res.json();
  return data.success ? data.token : null;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('=== Re-assessing every real founder\'s startup with the new 4-dimension model ===\n');

  for (const email of FOUNDER_EMAILS) {
    await sleep(400);
    const password = KNOWN_PASSWORDS[email] || PASSWORD;
    const token = await login(email, password);
    if (!token) { console.log(`  ✗ ${email}: login failed`); continue; }

    const startupsRes = await fetch(`${BASE}/startups/mine`, { headers: { Authorization: `Bearer ${token}` } });
    const startupsData = await startupsRes.json();
    if (!startupsData.success || startupsData.startups.length === 0) { console.log(`  - ${email}: no startup found`); continue; }

    for (const startup of startupsData.startups) {
      const res = await fetch(`${BASE}/startups/${startup.id}/assess`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const result = await res.json();
      console.log(`  ${result.success ? '✓' : '✗'} ${startup.name} — ${result.success ? `readiness now ${Math.round(result.readiness.overall_score)} (real 4-dimension model)` : result.error}`);
    }
  }

  console.log('\n=== Done. Note: this only reaches accounts you own the password for. ===');
  console.log('The system-import account (Product Hunt/real-company imports) and any');
  console.log('contributor/investor-side data are unaffected by this — this script is');
  console.log('specifically for founder readiness data.');
}
run();
