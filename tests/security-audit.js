/**
 * Sprint 12 — Security test script. Ref: SRS §97, architecture doc §96.
 * Run: node tests/security-audit.js (server must be running on :3000)
 * Requires two real tokens with different accounts (uses env vars).
 */
const BASE = 'http://localhost:3000';

async function expect(label, promise, expectedStatus) {
  const res = await promise;
  const pass = res.status === expectedStatus;
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${label} (expected ${expectedStatus}, got ${res.status})`);
  return pass;
}

async function run() {
  const founderToken = process.env.FOUNDER_TOKEN;
  const contributorToken = process.env.CONTRIBUTOR_TOKEN;
  const startupId = process.env.STARTUP_ID;

  if (!founderToken || !contributorToken || !startupId) {
    console.error('Set FOUNDER_TOKEN, CONTRIBUTOR_TOKEN, STARTUP_ID env vars first.');
    process.exit(1);
  }

  let passCount = 0, total = 0;
  const check = async (label, promise, status) => { total++; if (await expect(label, promise, status)) passCount++; };

  await check('No auth header on protected route -> 401',
    fetch(`${BASE}/api/profiles/me`), 401);

  await check('Contributor cannot view founder\'s gaps (not owner) -> 403 or 404',
    fetch(`${BASE}/api/startups/${startupId}/gaps`, { headers: { Authorization: `Bearer ${contributorToken}` } }),
    403); // will show actual status either way, informative even if 404 by design

  await check('Contributor cannot trigger analysis on someone else\'s startup -> 403',
    fetch(`${BASE}/api/startups/${startupId}/analyze`, { method: 'POST', headers: { Authorization: `Bearer ${contributorToken}` } }),
    403);

  await check('Invalid/garbage token -> 401',
    fetch(`${BASE}/api/profiles/me`, { headers: { Authorization: 'Bearer garbage.invalid.token' } }),
    401);

  await check('Founder CAN access own startup gaps -> 200',
    fetch(`${BASE}/api/startups/${startupId}/gaps`, { headers: { Authorization: `Bearer ${founderToken}` } }),
    200);

  console.log(`\n${passCount}/${total} security checks passed.`);
}

run();
