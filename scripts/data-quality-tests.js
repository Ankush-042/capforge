/**
 * Sprint 27 — Data Quality test suite. Ref: PRD §42.
 * Real, executable tests against the real live API — not a checklist,
 * an actual pass/fail suite verifying: required-field validation,
 * duplicate detection, silent-overwrite prevention.
 * Run: node scripts/data-quality-tests.js
 */
const BASE = 'http://localhost:3000/api';
let passed = 0, failed = 0;

function check(label, condition) {
  if (condition) { console.log(`  PASS — ${label}`); passed++; }
  else { console.log(`  FAIL — ${label}`); failed++; }
}

async function run() {
  console.log('=== Required-field validation ===');
  const missingName = await fetch(`${BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'x@x.com', password: 'testpass123', primaryRole: 'FOUNDER' }) });
  check('Registration without displayName is rejected', missingName.status === 400);

  const badEmail = await fetch(`${BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'not-an-email', password: 'testpass123', primaryRole: 'FOUNDER', displayName: 'Test' }) });
  check('Registration with invalid email format is rejected', badEmail.status === 400);

  const weakPassword = await fetch(`${BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `dq${Date.now()}@test.com`, password: '123', primaryRole: 'FOUNDER', displayName: 'Test' }) });
  check('Registration with a weak/short password is rejected', weakPassword.status === 400);

  console.log('\n=== Duplicate detection ===');
  const email = `dqtest${Date.now()}@test.com`;
  const first = await fetch(`${BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'testpass123', primaryRole: 'FOUNDER', displayName: 'DQ Test' }) });
  check('First registration with a new email succeeds', first.status === 201);
  const duplicate = await fetch(`${BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'testpass123', primaryRole: 'FOUNDER', displayName: 'DQ Test 2' }) });
  check('Duplicate email registration is rejected (409)', duplicate.status === 409);

  console.log('\n=== Silent-overwrite prevention ===');
  const loginRes = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'testpass123' }) });
  const { token } = await loginRes.json();

  const setSkills = await fetch(`${BASE}/profiles/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ skills: ['python', 'react'] }) });
  const setSkillsData = await setSkills.json();
  check('Setting skills succeeds', setSkillsData.success === true);

  const partialUpdate = await fetch(`${BASE}/profiles/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ headline: 'New headline' }) });
  const partialData = await partialUpdate.json();
  check('Updating headline only does NOT silently wipe previously-set skills', JSON.stringify(partialData.profile.skills) === JSON.stringify(['python', 'react']));

  console.log(`\n=== ${passed}/${passed + failed} data quality checks passed ===`);
}
run();
