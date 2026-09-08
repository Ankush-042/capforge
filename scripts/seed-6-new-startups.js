/**
 * Step 1 of the god-mode skill-distribution plan: create 6 new real
 * startups across genuinely distinct domains, through the actual
 * pipeline (real AI structuring, real diagnosis). No skill-crafting
 * happens here — this step ONLY produces real gap data to design
 * against in later steps.
 *
 * Run: node scripts/seed-6-new-startups.js
 */
require('dotenv').config();
const BASE = 'http://localhost:3000/api';
const PASSWORD = 'SeedPass123!';

const FOUNDERS = [
  {
    email: 'founder.securelayer@seed.test', displayName: 'Founder', startup: 'SecureLayer',
    idea: 'A cybersecurity platform for small and mid-sized businesses that continuously scans their cloud infrastructure and employee devices for vulnerabilities, phishing exposure, and misconfigurations, then auto-generates a prioritized remediation checklist — built for teams too small to have a dedicated security engineer.'
  },
  {
    email: 'founder.keystack@seed.test', displayName: 'Founder', startup: 'KeyStack',
    idea: 'A property management platform for independent landlords and small real estate investors that automates rent collection, maintenance requests, and tenant screening, with a real-time dashboard showing portfolio-wide occupancy and cash flow across multiple properties.'
  },
  {
    email: 'founder.teampulse@seed.test', displayName: 'Founder', startup: 'TeamPulse',
    idea: 'An employee engagement and people-analytics platform for mid-size companies that runs continuous, lightweight pulse surveys, detects early signs of burnout or disengagement from real usage patterns, and gives HR teams specific, actionable interventions instead of generic dashboards.'
  },
  {
    email: 'founder.streamline@seed.test', displayName: 'Founder', startup: 'Streamline',
    idea: 'A monetization platform for independent content creators that unifies revenue from multiple platforms (YouTube, Patreon, sponsorships) into one dashboard, automates sponsorship deal tracking and invoicing, and uses AI to suggest optimal pricing based on real engagement data.'
  },
  {
    email: 'founder.clauseiq@seed.test', displayName: 'Founder', startup: 'ClauseIQ',
    idea: 'An AI-powered contract review tool for small law firms and in-house legal teams that flags risky clauses, compares terms against a firm\'s own historical contracts, and drafts redline suggestions — cutting first-pass contract review time significantly without replacing lawyer judgment.'
  },
  {
    email: 'founder.geneforge@seed.test', displayName: 'Founder', startup: 'GeneForge',
    idea: 'A lab automation platform for synthetic biology researchers that coordinates robotic liquid-handling equipment, tracks experiment provenance across a genetic engineering pipeline, and uses machine learning to suggest which gene-editing variants are most likely to succeed based on prior lab results.'
  },
];

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}
async function patch(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('=== Step 1: Creating 6 new real startups across distinct domains ===\n');

  for (const f of FOUNDERS) {
    await sleep(8000); // real AI rate limit is 10/min on POST /startups — 8s spacing stays safely under it

    let token;
    const reg = await post('/auth/register', { email: f.email, password: PASSWORD, primaryRole: 'FOUNDER', displayName: f.displayName });
    if (reg.ok) {
      token = reg.data.token;
    } else if (reg.data.error === 'EMAIL_ALREADY_EXISTS') {
      // Real, correct resume path: this founder + their AI-structured
      // startup already exist from an earlier partial run — log in
      // instead of failing, and pick up from here.
      const login = await post('/auth/login', { email: f.email, password: PASSWORD });
      if (!login.ok) { console.log(`  ✗ ${f.startup}: exists but login failed — ${login.data.error}`); continue; }
      token = login.data.token;
    } else {
      console.log(`  ✗ ${f.startup}: registration failed — ${reg.data.error}`); continue;
    }

    let startupId;
    const mine = await fetch(`${BASE}/startups/mine`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    if (mine.success && mine.startups.length > 0) {
      startupId = mine.startups[0].id; // real resume: use the already-structured startup, don't re-create
    } else {
      const create = await post('/startups', { name: f.startup, rawIdea: f.idea }, token);
      if (!create.ok || !create.data.success) { console.log(`  ✗ ${f.startup}: creation/structuring failed — ${create.data.error}, ${create.data.detail}`); continue; }
      startupId = create.data.startup.id;
    }

    const confirmRes = await patch(`/startups/${startupId}/confirm`, {}, token);
    if (!confirmRes.ok || !confirmRes.data.success) { console.log(`  ✗ ${f.startup}: confirm failed — ${confirmRes.data.error}, ${confirmRes.data.detail}`); continue; }

    const diagRes = await post(`/startups/${startupId}/diagnose`, {}, token);
    if (!diagRes.ok || !diagRes.data.success) { console.log(`  ✗ ${f.startup}: diagnosis failed — ${diagRes.data.error}, ${diagRes.data.detail}`); continue; }

    console.log(`  ✓ ${f.startup} — created, structured, ${diagRes.data.gaps?.length || 0} real gaps diagnosed`);
    for (const gap of diagRes.data.gaps || []) {
      console.log(`      - ${gap.role} (${gap.priority_level}): requires [${gap.required_skills.join(', ')}]`);
    }
  }

  console.log('\n=== Step 1 done. Real gap data printed above — this is what Step 4 will design against. ===');
}
run();
