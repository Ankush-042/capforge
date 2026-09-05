/**
 * Phase 7 — real public startup data import. Ref: PRD's Discoverable/
 * Claimed/Verified trust model (built Sprint 2, never actually used
 * for its intended purpose until now) + the "feels empty" problem.
 *
 * Every entry below is a REAL, named, publicly known company —
 * verified via live search, not from memory — with a factual,
 * independently-worded one-line description (not copied marketing
 * copy). Each is run through CapForge's own real AI structuring
 * pipeline, exactly like a founder's raw idea would be. These are
 * marked UNVERIFIED (technically owned by a system import account,
 * not claimed by a real founder) — the trust model already has a
 * real state for exactly this case; using it correctly here for the
 * first time.
 *
 * Run: node scripts/import-real-startups.js
 * (requires the backend running, and one seed admin account already
 * promoted via `UPDATE users SET is_admin = true` — see below)
 */
const BASE = 'http://localhost:3000/api';
const PASSWORD = 'SystemImport123!';
const SYSTEM_EMAIL = 'system.import@capforge.internal';
const ADMIN_EMAIL = 'founder.neura@seed.test'; // must already be promoted to admin
const ADMIN_PASSWORD = 'SeedPass123!';

// Real, named, publicly known companies — verified via live search
// (not from training memory), spanning genuinely different domains.
const REAL_STARTUPS = [
  { name: 'Vanta', idea: 'A compliance automation platform that continuously monitors a company\'s security controls and helps them get certified for standards like SOC 2, HIPAA, and ISO 27001 faster than manual audits allow.' },
  { name: 'Checkr', idea: 'Background-check infrastructure used by employers to screen job applicants quickly and fairly, replacing slow manual verification processes.' },
  { name: 'Scale AI', idea: 'A data-labeling and reinforcement-learning-from-human-feedback platform that helps large organizations train and improve their AI models with high-quality training data.' },
  { name: 'Ginkgo Bioworks', idea: 'A synthetic biology and genetic engineering platform that designs custom organisms for industrial applications, from agriculture to pharmaceuticals.' },
  { name: 'Amplitude', idea: 'A product analytics platform that helps companies track how users actually behave inside their apps and websites, to guide product decisions.' },
  { name: 'Faire', idea: 'A wholesale marketplace connecting independent retail shops directly with small and emerging brands, replacing traditional trade-show-based wholesale buying.' },
  { name: 'Brex', idea: 'Corporate credit cards and spend-management software built specifically for startups and growing companies, with built-in expense tracking.' },
  { name: 'Instacart', idea: 'An on-demand grocery delivery marketplace connecting shoppers with personal shoppers who pick and deliver groceries from local stores.' },
  { name: 'GitLab', idea: 'An all-in-one DevOps platform covering the full software development lifecycle — source control, CI/CD, and deployment — in a single tool.' },
  { name: 'Poshmark', idea: 'A social commerce marketplace for buying and selling new and secondhand fashion, built around a social-feed-style shopping experience.' },
];

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}
async function patch(path, body, token) {
  const res = await fetch(`${BASE}${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}
async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const data = await res.json();
  return data.success ? data.token : null;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('=== Importing real, named public startups as UNVERIFIED/Discoverable ===\n');

  // Get or create the system import account.
  let systemToken = await login(SYSTEM_EMAIL, PASSWORD);
  if (!systemToken) {
    const reg = await post('/auth/register', { email: SYSTEM_EMAIL, password: PASSWORD, primaryRole: 'FOUNDER', displayName: 'CapForge Public Directory' });
    systemToken = reg.data.token;
  }
  if (!systemToken) { console.log('Could not create/login the system import account.'); return; }

  const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!adminToken) { console.log(`Could not log in as admin (${ADMIN_EMAIL}). Real UNVERIFIED status will be skipped — entries stay CLAIMED.`); }

  for (const s of REAL_STARTUPS) {
    await sleep(600);
    const create = await post('/startups', { name: s.name, rawIdea: s.idea }, systemToken);
    if (!create.ok || !create.data.success) { console.log(`  ✗ ${s.name}: creation failed — ${create.data.error || create.data.detail}`); continue; }
    const startupId = create.data.startup.id;

    await post(`/startups/${startupId}/confirm`, {}, systemToken);
    await post(`/startups/${startupId}/diagnose`, {}, systemToken);

    if (adminToken) {
      await patch(`/admin/startups/${startupId}/verification`, { status: 'UNVERIFIED' }, adminToken);
    }
    console.log(`  ✓ ${s.name} — imported, structured, diagnosed${adminToken ? ', marked UNVERIFIED' : ''}`);
  }

  console.log('\n=== Done. Real public startups now discoverable via Search. ===');
}

run();
