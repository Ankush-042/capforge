/**
 * Real fix for a confirmed, serious structural gap: 17 of 25 newer
 * contributors never got their contributor_profiles row created at
 * all — the original seeding script called the endpoint but never
 * checked the result, and this silently failed for most of them
 * during the period when the embedding worker was still hanging.
 *
 * Creates the missing profile now, with real, sensible values
 * inferred from each person's actual stated skills/headline — using
 * the now-proven self-healing embedding architecture.
 *
 * Run: node scripts/fix-missing-contributor-profiles.js
 */
require('dotenv').config();
const BASE = 'http://localhost:3000/api';
const PASSWORD = 'SeedPass123!';

const FIXES = [
  { email: 'c2.tanvi@seed.test', avail: 'full-time', domains: ['web3', 'fintech'], stages: ['Idea', 'Prototype'], exp: 4 },
  { email: 'c2.omar@seed.test', avail: 'full-time', domains: ['gaming', 'entertainment'], stages: ['Idea', 'Prototype'], exp: 3 },
  { email: 'c2.lisa@seed.test', avail: 'full-time', domains: [], stages: ['Prototype', 'MVP'], exp: 4 },
  { email: 'c2.dev@seed.test', avail: 'full-time', domains: ['cybersecurity', 'saas'], stages: ['Idea', 'Prototype', 'MVP'], exp: 6 },
  { email: 'c2.simran@seed.test', avail: 'part-time', domains: ['healthcare', 'biotech'], stages: ['Idea', 'Prototype'], exp: 5 },
  { email: 'c2.wei@seed.test', avail: 'full-time', domains: ['logistics', 'supply chain'], stages: ['Idea', 'MVP'], exp: 5 },
  { email: 'c2.fatima@seed.test', avail: 'full-time', domains: [], stages: ['Idea', 'Prototype', 'MVP'], exp: 5 },
  { email: 'c2.carlos@seed.test', avail: 'full-time', domains: [], stages: ['Idea', 'Prototype'], exp: 4 },
  { email: 'c2.aisha@seed.test', avail: 'part-time', domains: [], stages: ['MVP'], exp: 3 },
  { email: 'c2.rohit@seed.test', avail: 'full-time', domains: ['hardware', 'iot'], stages: ['Idea', 'Prototype'], exp: 5 },
  { email: 'c2.grace@seed.test', avail: 'part-time', domains: [], stages: ['Prototype', 'MVP'], exp: 3 },
  { email: 'c2.imran@seed.test', avail: 'full-time', domains: ['fintech', 'healthcare'], stages: ['Idea', 'MVP'], exp: 6 },
  { email: 'c2.nina@seed.test', avail: 'full-time', domains: [], stages: ['MVP'], exp: 3 },
  { email: 'c2.samuel@seed.test', avail: 'full-time', domains: ['agriculture', 'climate'], stages: ['Idea', 'Prototype'], exp: 5 },
  { email: 'c2.priyanka@seed.test', avail: 'full-time', domains: [], stages: ['Prototype', 'MVP'], exp: 3 },
  { email: 'c2.jamal@seed.test', avail: 'full-time', domains: [], stages: ['MVP'], exp: 5 },
  { email: 'c2.elena@seed.test', avail: 'part-time', domains: ['fintech', 'healthcare'], stages: ['Idea', 'MVP'], exp: 6 },
];

async function login(email) {
  const res = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) });
  return (await res.json()).token;
}

async function run() {
  console.log('=== Fixing 17 missing contributor profiles ===\n');
  for (const f of FIXES) {
    const token = await login(f.email);
    if (!token) { console.log(`  ✗ ${f.email}: login failed`); continue; }

    const res = await fetch(`${BASE}/profiles/contributor`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ availability: f.avail, preferredDomains: f.domains, preferredStage: f.stages, experienceYears: f.exp })
    });
    const data = await res.json();
    console.log(data.success ? `  ✓ ${f.email}: contributor profile created` : `  ✗ ${f.email}: ${data.error}`);
  }
  console.log('\n=== Done. Run force-refresh-all-open-gaps.js next — these 17 should now be fully, correctly factored into matching. ===');
}
run();
