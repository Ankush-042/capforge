/**
 * Step 4/5: precise, targeted skill additions to close the genuinely
 * under-covered, specialized real gaps identified from the actual
 * data (get-all-real-open-gaps.js + get-all-contributor-skills.js).
 * Common roles (Full Stack, DevOps, UI/UX, PM, generic ML) are already
 * well-covered across the 37 via the real token-matching fix — this
 * targets only the specific, hard-to-fill CRITICAL gaps that had zero
 * or weak real coverage.
 *
 * CRITICAL: appends to each contributor's EXISTING skills, never
 * replaces them — the exact mistake made earlier with Arjun is not
 * being repeated here.
 *
 * Left deliberately uncovered, as a realistic hard-to-fill gap:
 * TeamPulse's HR Analyst (no existing contributor has a coherent,
 * non-forced pivot into people analytics).
 *
 * Run: node scripts/precision-skill-updates.js
 */
require('dotenv').config();
const BASE = 'http://localhost:3000/api';
const PASSWORD = 'SeedPass123!';

const UPDATES = [
  { email: 'c2.dev@seed.test', add: ['cloud security posture management', 'azure', 'gcp'], reason: "SecureLayer's Cloud Security Engineer gap — was close (aws/terraform/k8s), now precise" },
  { email: 'c.rohan@seed.test', add: ['threat modeling', 'penetration testing', 'vulnerability assessment'], reason: "SecureLayer's Security Analyst gap — coherent extension of his existing security focus" },
  { email: 'c2.simran@seed.test', add: ['genetic engineering pipelines', 'lims integration', 'medical diagnostics'], reason: "GeneForge's Bioinformatics Engineer AND NeuraHealth's Clinical Advisor — real biomedical extension" },
  { email: 'c2.elena@seed.test', add: ['contract law', 'legal risk assessment'], reason: "ClauseIQ's Legal Advisor — real adjacency from her data-privacy/compliance background" },
  { email: 'c2.isabella@seed.test', add: ['invoicing', 'tax compliance', 'financial regulations'], reason: "Streamline's Compliance/Finance Specialist — she's already finance-focused, coherent extension" },
  { email: 'c2.samuel@seed.test', add: ['satellite imagery processing'], reason: "ClimateLens's ML Engineer gap — bridges his existing remote-sensing/GIS background precisely" },
  { email: 'c.aditya@seed.test', add: ['sponsorship deal negotiation', 'platform integration'], reason: "Streamline's Business Development Manager — coherent extension of his partnerships/B2B sales" },
  { email: 'c2.victor@seed.test', add: ['power systems', 'ev charging standards'], reason: "EcoCharge's Electrical Engineer — coherent extension of his hardware engineering background" },
  { email: 'c.karan@seed.test', add: ['image capture integration'], reason: "NeuraHealth's Mobile App Developer — closes the one missing term on an already-strong match" },
];

async function login(email) {
  const res = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) });
  const data = await res.json();
  return data.token;
}
async function getMyProfile(token) {
  const res = await fetch(`${BASE}/profiles/me`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}
async function patchProfile(token, body) {
  const res = await fetch(`${BASE}/profiles/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  return res.json();
}

async function run() {
  console.log('=== Step 5: precision skill updates — appending to existing skills, never replacing ===\n');
  for (const u of UPDATES) {
    const token = await login(u.email);
    if (!token) { console.log(`  ✗ ${u.email}: login failed`); continue; }

    const profileRes = await getMyProfile(token);
    if (!profileRes.success) { console.log(`  ✗ ${u.email}: could not fetch current profile`); continue; }
    const existingSkills = profileRes.profile.skills || [];

    const combinedSkills = [...new Set([...existingSkills, ...u.add])]; // real append, dedup, never a wholesale replace
    const result = await patchProfile(token, { skills: combinedSkills });

    if (result.success) {
      console.log(`  ✓ ${profileRes.profile.display_name}: [${existingSkills}] → [${combinedSkills}]`);
      console.log(`      (${u.reason})`);
    } else {
      console.log(`  ✗ ${u.email}: update failed — ${result.error}`);
    }
  }
  console.log('\n=== Done. Run force-refresh-all-open-gaps.js next to re-rank against these real, updated skills. ===');
}
run();
