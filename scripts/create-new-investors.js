/**
 * Real fix for a confirmed gap: none of the 5 existing investor
 * theses cover cybersecurity, legal tech, HR tech, real estate,
 * creator economy, or biotech — meaning SecureLayer, ClauseIQ,
 * TeamPulse, KeyStack, Streamline, and GeneForge would score poorly
 * on domain fit for every current investor, even with real readiness.
 *
 * 2 new, coherent investor theses split the 6 domains sensibly:
 * Frontier Capital (enterprise/B2B infra) and Helix Ventures
 * (deep-tech/vertical platforms) — using domain strings verified to
 * genuinely match the real stored startup domains.
 *
 * Run: node scripts/create-new-investors.js
 */
require('dotenv').config();
const BASE = 'http://localhost:3000/api';
const PASSWORD = 'SeedPass123!';

const INVESTORS = [
  {
    email: 'i.frontier@seed.test', name: 'Frontier Capital',
    thesis: 'Seed-stage enterprise infrastructure — cybersecurity, HR tech, and legal tech platforms solving real compliance and operational pain for mid-market companies.',
    ticketMin: 50000, ticketMax: 300000,
    preferredDomains: ['cybersecurity', 'hr tech', 'legal tech'], preferredStages: ['idea', 'seed'], investmentType: 'Equity'
  },
  {
    email: 'i.helix@seed.test', name: 'Helix Ventures',
    thesis: 'Pre-seed to seed deep-tech and vertical platforms — biotech lab automation, proptech, and creator economy infrastructure with genuine technical differentiation.',
    ticketMin: 75000, ticketMax: 400000,
    preferredDomains: ['biotech', 'real estate', 'creator economy'], preferredStages: ['pre-seed', 'idea', 'seed'], investmentType: 'Equity'
  },
];

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return res.json();
}

async function run() {
  console.log('=== Creating 2 new real investors covering the previously-uncovered domains ===\n');
  for (const inv of INVESTORS) {
    const reg = await post('/auth/register', { email: inv.email, password: PASSWORD, primaryRole: 'INVESTOR', displayName: inv.name });
    const token = reg.token;
    if (!token) { console.log(`  ✗ ${inv.name}: registration failed — ${reg.error}`); continue; }

    const result = await post('/profiles/investor', { thesis: inv.thesis, ticketMin: inv.ticketMin, ticketMax: inv.ticketMax, preferredDomains: inv.preferredDomains, preferredStages: inv.preferredStages, investmentType: inv.investmentType }, token);
    console.log(result.success ? `  ✓ ${inv.name}: thesis set — [${inv.preferredDomains}]` : `  ✗ ${inv.name}: ${result.error}`);
  }
  console.log('\n=== Done. ===');
}
run();
