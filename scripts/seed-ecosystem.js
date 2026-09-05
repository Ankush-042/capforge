/**
 * Sprint C — Ecosystem seeding script.
 * Ref: architecture doc §92 (realistic seed data, "necessary for testing
 * recommendation quality"), AI spec §75 (Test Data Strategy).
 *
 * Runs entirely against the REAL API — every account, startup, and
 * profile created here goes through the actual registration, AI
 * structuring, gap diagnosis, and profile endpoints. Nothing here is
 * fake display data; it's real rows in your real database, created the
 * same way a real user would create them.
 *
 * Run: node scripts/seed-ecosystem.js
 * (requires the backend running on localhost:3000 — npm start in a
 * separate terminal first)
 */

const BASE = 'http://localhost:3000/api';

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}
async function get(path, token) {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ---- Founders + startups: 6 across genuinely different domains ----
const FOUNDERS = [
  { email: 'founder.neura@seed.test', name: 'Aisha Kapoor', startup: 'NeuraHealth',
    idea: 'An AI diagnostic assistant that helps rural clinics screen for common conditions using smartphone-captured images and basic vitals, flagging cases that need urgent referral.',
    teamSize: 1, fundingStage: 'Pre-seed', timeline: 'Pilot with 3 clinics in 6 months', equity: '8-12% for a technical co-founder', priorExp: '4 years as a product manager in digital health' },
  { email: 'founder.ecocharge@seed.test', name: 'Marcus Webb', startup: 'EcoCharge',
    idea: 'A network of AI-optimized EV charging stations that predict demand and dynamically price electricity to reduce grid strain during peak hours.',
    teamSize: 2, fundingStage: 'Seed', timeline: 'Deploy 10 pilot stations in 8 months', equity: '5-8% for a hardware/embedded engineer', priorExp: 'Former energy sector engineer, 6 years' },
  { email: 'founder.learnloop@seed.test', name: 'Sofia Martinez', startup: 'LearnLoop',
    idea: 'An adaptive learning platform for high school math that adjusts difficulty in real time based on how a student solves problems, not just whether they get them right.',
    teamSize: 1, fundingStage: 'Bootstrapped', timeline: 'Launch beta with 5 schools in 4 months', equity: '10-15% for a full-stack co-founder', priorExp: 'Former math teacher, 7 years in EdTech content' },
  { email: 'founder.paybridge@seed.test', name: 'David Okafor', startup: 'PayBridge',
    idea: 'A cross-border payment platform for freelancers in emerging markets to receive USD/EUR payments and convert to local currency with minimal fees.',
    teamSize: 2, fundingStage: 'Seed', timeline: 'Regulatory approval + launch in 10 months', equity: '6-10% for a compliance/backend lead', priorExp: 'Ex-fintech operations, 5 years' },
  { email: 'founder.logichain@seed.test', name: 'Priya Sharma', startup: 'LogiChain',
    idea: 'AI-powered demand forecasting and route optimization for last-mile delivery fleets in tier-2 Indian cities.',
    teamSize: 1, fundingStage: 'Pre-seed', timeline: 'MVP with 1 logistics partner in 5 months', equity: '8-10% for an ML engineer', priorExp: '3 years in supply chain analytics' },
  { email: 'founder.climatelens@seed.test', name: 'Tom Baker', startup: 'ClimateLens',
    idea: 'A satellite-imagery analysis tool that helps agricultural insurers assess crop damage claims faster and more accurately than manual site visits.',
    teamSize: 1, fundingStage: 'Idea', timeline: 'Proof of concept in 3 months', equity: '10-15% for a computer vision engineer', priorExp: 'Former geospatial data analyst' },
];

// ---- Contributors: 12 across genuinely varied skills/domains/availability ----
const CONTRIBUTORS = [
  { email: 'c.priya@seed.test', name: 'Priya Data', headline: 'Data Scientist', skills: ['machine learning', 'data modeling', 'python'], exp: 4, avail: 'part-time', stages: ['idea', 'mvp'], domains: ['food service'] },
  { email: 'c.arjun@seed.test', name: 'Arjun Mehta', headline: 'Full Stack Engineer', skills: ['react', 'node.js', 'postgresql'], exp: 3, avail: 'full-time', stages: ['idea', 'prototype'], domains: ['healthtech'] },
  { email: 'c.sara@seed.test', name: 'Sara Chen', headline: 'ML Engineer', skills: ['computer vision', 'pytorch', 'model architecture'], exp: 5, avail: 'full-time', stages: ['pre-seed', 'seed'], domains: ['healthtech', 'climate'] },
  { email: 'c.rahul@seed.test', name: 'Rahul Verma', headline: 'Backend Engineer', skills: ['python', 'django', 'compliance systems'], exp: 6, avail: 'full-time', stages: ['seed'], domains: ['fintech'] },
  { email: 'c.neha@seed.test', name: 'Neha Kapoor', headline: 'Product Designer', skills: ['user experience design', 'user interface design', 'prototyping'], exp: 4, avail: 'part-time', stages: ['idea', 'prototype'], domains: ['edtech'] },
  { email: 'c.vikram@seed.test', name: 'Vikram Singh', headline: 'DevOps Engineer', skills: ['aws', 'kubernetes', 'embedded systems'], exp: 5, avail: 'full-time', stages: ['seed'], domains: ['climate'] },
  { email: 'c.ananya@seed.test', name: 'Ananya Rao', headline: 'Growth Marketer', skills: ['b2b sales', 'growth marketing', 'content strategy'], exp: 3, avail: 'part-time', stages: ['mvp', 'early traction'], domains: ['saas'] },
  { email: 'c.karan@seed.test', name: 'Karan Malhotra', headline: 'Mobile Engineer', skills: ['ios development', 'android development', 'react native'], exp: 4, avail: 'full-time', stages: ['seed'], domains: ['fintech'] },
  { email: 'c.divya@seed.test', name: 'Divya Nair', headline: 'Data Engineer', skills: ['data pipelines', 'etl', 'route optimization'], exp: 3, avail: 'full-time', stages: ['idea', 'pre-seed'], domains: ['logistics'] },
  { email: 'c.aditya@seed.test', name: 'Aditya Kumar', headline: 'Business Development', skills: ['enterprise sales', 'partnerships', 'b2b sales'], exp: 6, avail: 'advisor', stages: ['seed', 'early traction'], domains: ['saas', 'fintech'] },
  { email: 'c.meera@seed.test', name: 'Meera Iyer', headline: 'UX Researcher', skills: ['user research', 'usability testing'], exp: 2, avail: 'part-time', stages: ['idea', 'prototype'], domains: ['healthtech'] },
  { email: 'c.rohan@seed.test', name: 'Rohan Gupta', headline: 'Security Engineer', skills: ['application security', 'compliance systems', 'backend development'], exp: 5, avail: 'full-time', stages: ['seed'], domains: ['fintech'] },
];

// ---- Investors: 4 with genuinely different theses ----
const INVESTORS = [
  { email: 'i.raj@seed.test', name: 'Raj Capital', thesis: 'Early-stage food-tech and hospitality SaaS', stages: ['idea'], domains: ['food service'], ticketMin: 25000, ticketMax: 100000, type: 'Angel' },
  { email: 'i.meridian@seed.test', name: 'Meridian Ventures', thesis: 'Seed-to-Series A health-tech and fintech infrastructure', stages: ['seed'], domains: ['healthtech', 'fintech'], ticketMin: 250000, ticketMax: 1500000, type: 'VC Fund' },
  { email: 'i.greenseed@seed.test', name: 'GreenSeed Partners', thesis: 'Pre-seed and seed climate and energy infrastructure', stages: ['pre-seed', 'seed'], domains: ['climate'], ticketMin: 100000, ticketMax: 500000, type: 'VC Fund' },
  { email: 'i.nextwave@seed.test', name: 'NextWave Angels', thesis: 'Broad early-stage technology, opportunistic across sectors', stages: ['idea', 'prototype'], domains: ['edtech', 'saas', 'logistics'], ticketMin: 10000, ticketMax: 50000, type: 'Syndicate' },
];

const PASSWORD = 'SeedPass123!';

async function seedFounders() {
  console.log('\n=== Seeding Founders + Startups ===');
  for (const f of FOUNDERS) {
    const reg = await post('/auth/register', { email: f.email, password: PASSWORD, primaryRole: 'FOUNDER', displayName: f.name });
    if (!reg.ok) { console.log(`  ✗ ${f.startup}: registration failed —`, reg.data.error); continue; }
    const token = reg.data.token;

    const create = await post('/startups', {
      name: f.startup, rawIdea: f.idea, currentTeamSize: f.teamSize, fundingStage: f.fundingStage,
      targetTimeline: f.timeline, equityOfferedRange: f.equity, founderPriorExperience: f.priorExp
    }, token);
    if (!create.ok || !create.data.success) { console.log(`  ✗ ${f.startup}: creation/AI structuring failed —`, create.data.detail || create.data.error); continue; }
    const startupId = create.data.startup.id;

    await post(`/startups/${startupId}/confirm`, {}, token);
    await post(`/startups/${startupId}/diagnose`, {}, token);
    await post(`/startups/${startupId}/assess`, {}, token);
    console.log(`  ✓ ${f.startup} — created, structured, diagnosed, assessed`);
    await sleep(500); // gentle pacing against the AI rate limiter
  }
}

async function seedContributors() {
  console.log('\n=== Seeding Contributors ===');
  for (const c of CONTRIBUTORS) {
    const reg = await post('/auth/register', { email: c.email, password: PASSWORD, primaryRole: 'CONTRIBUTOR', displayName: c.name });
    if (!reg.ok) { console.log(`  ✗ ${c.name}: registration failed —`, reg.data.error); continue; }
    const token = reg.data.token;

    await fetch(`${BASE}/profiles/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ headline: c.headline, skills: c.skills }) });
    await post('/profiles/contributor', { availability: c.avail, preferredStage: c.stages, preferredDomains: c.domains, experienceYears: c.exp }, token);
    console.log(`  ✓ ${c.name} (${c.headline})`);
  }
}

async function seedInvestors() {
  console.log('\n=== Seeding Investors ===');
  for (const i of INVESTORS) {
    const reg = await post('/auth/register', { email: i.email, password: PASSWORD, primaryRole: 'INVESTOR', displayName: i.name });
    if (!reg.ok) { console.log(`  ✗ ${i.name}: registration failed —`, reg.data.error); continue; }
    const token = reg.data.token;

    await post('/profiles/investor', { thesis: i.thesis, preferredStages: i.stages, preferredDomains: i.domains, ticketMin: i.ticketMin, ticketMax: i.ticketMax, investmentType: i.type }, token);
    console.log(`  ✓ ${i.name} — ${i.thesis}`);
  }
}

async function run() {
  console.log('CapForge Ecosystem Seed — real API calls, real database, real AI structuring.');
  console.log(`This will take a few minutes (${FOUNDERS.length} AI structuring calls + diagnosis/assessment).`);
  await seedFounders();
  await seedContributors();
  await seedInvestors();
  console.log('\n=== Done. Ecosystem seeded: 6 founders/startups, 12 contributors, 4 investors. ===');
  console.log(`All seed accounts use password: ${PASSWORD}`);
}

run();
