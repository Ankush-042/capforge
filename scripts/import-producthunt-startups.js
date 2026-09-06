/**
 * Phase 7 — real public startup import via Product Hunt's live API.
 * Ref: PRD's Discoverable/Claimed/Verified trust model, the "feels
 * empty" problem, and the earlier decision to avoid this (which cost
 * more time via the alternative than this would have — corrected here).
 *
 * Pulls real, current, named startups directly from Product Hunt's
 * GraphQL v2 API, each with its real tagline as the raw idea input,
 * run through CapForge's own AI structuring pipeline exactly like any
 * founder's idea would be. Marked UNVERIFIED (technically owned by a
 * system import account, not claimed by a real founder) — using the
 * trust model exactly as designed since Sprint 2.
 *
 * Requires PRODUCTHUNT_API_TOKEN in .env (Developer Token from
 * api.producthunt.com/v2/oauth/applications).
 *
 * Run: node scripts/import-producthunt-startups.js
 */
require('dotenv').config();

const BASE = 'http://localhost:3000/api';
const PH_ENDPOINT = 'https://api.producthunt.com/v2/api/graphql';
const PASSWORD = 'SystemImport123!';
const SYSTEM_EMAIL = 'system.import@capforge.internal';
const ADMIN_EMAIL = 'founder.neura@seed.test'; // must already be promoted to admin
const ADMIN_PASSWORD = 'SeedPass123!';
const IMPORT_COUNT = 50;

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

/**
 * Real GraphQL query against Product Hunt's live v2 API — pulls
 * currently-featured posts (real products/startups), most recent first.
 * Uses real cursor-based pagination (Relay-style, endCursor/hasNextPage)
 * to page through multiple batches in ONE run, since Product Hunt caps
 * each individual request at 20 results regardless of what's requested.
 */
async function fetchProductHuntStartups(targetCount) {
  const token = process.env.PRODUCTHUNT_API_TOKEN;
  if (!token) { console.log('PRODUCTHUNT_API_TOKEN not set in .env — cannot fetch.'); return []; }

  const results = [];
  let cursor = null;
  let hasNextPage = true;

  while (results.length < targetCount && hasNextPage) {
    const afterClause = cursor ? `, after: "${cursor}"` : '';
    const query = `
      query {
        posts(first: 20, order: RANKING${afterClause}) {
          pageInfo { endCursor hasNextPage }
          edges { node { name tagline description } }
        }
      }
    `;

    const res = await fetch(PH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query })
    });

    if (!res.ok) { console.log(`Product Hunt API error ${res.status}: ${await res.text()}`); break; }
    const data = await res.json();
    if (data.errors) { console.log('Product Hunt API returned errors:', JSON.stringify(data.errors)); break; }

    const page = data.data?.posts;
    const nodes = (page?.edges || []).map(e => e.node).filter(n => n.name && (n.tagline || n.description));
    results.push(...nodes.map(n => ({ name: n.name, idea: n.description || n.tagline })));

    hasNextPage = page?.pageInfo?.hasNextPage;
    cursor = page?.pageInfo?.endCursor;
    console.log(`  Fetched page: ${nodes.length} startups (running total: ${results.length})`);

    if (hasNextPage) await sleep(1000); // brief pause between Product Hunt's own pages
  }

  // Real bug fix: Product Hunt's own paginated results can repeat an
  // entry across pages (confirmed — 'OP.GG for Time Takers' appeared
  // twice in a real run). Dedupe by name within this fetch itself,
  // not just against previous runs.
  const seen = new Set();
  const deduped = results.filter(s => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });

  return deduped.slice(0, targetCount);
}

async function run() {
  console.log('=== Fetching real, current startups from Product Hunt\'s live API ===');
  const startups = await fetchProductHuntStartups(IMPORT_COUNT);
  if (startups.length === 0) { console.log('No startups fetched — check PRODUCTHUNT_API_TOKEN and try again.'); return; }
  console.log(`Fetched ${startups.length} real startups.\n`);

  let systemToken = await login(SYSTEM_EMAIL, PASSWORD);
  if (!systemToken) {
    const reg = await post('/auth/register', { email: SYSTEM_EMAIL, password: PASSWORD, primaryRole: 'FOUNDER', displayName: 'CapForge Public Directory' });
    systemToken = reg.data.token;
  }
  if (!systemToken) { console.log('Could not create/login the system import account.'); return; }

  // Real duplicate check: skip anything already imported in a previous run.
  const existingRes = await fetch(`${BASE}/startups/mine`, { headers: { Authorization: `Bearer ${systemToken}` } });
  const existingData = await existingRes.json();
  const existingNames = new Set((existingData.startups || []).map(s => s.name));
  const newStartups = startups.filter(s => !existingNames.has(s.name));
  console.log(`${existingNames.size} already imported previously, ${newStartups.length} genuinely new to import.\n`);

  const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!adminToken) console.log(`Could not log in as admin (${ADMIN_EMAIL}) — entries will stay CLAIMED instead of UNVERIFIED.`);

  let imported = 0;
  for (const s of newStartups) {
    await sleep(7000); // POST /startups is AI-rate-limited to 10/min — 7s spacing stays safely under that
    const create = await post('/startups', { name: s.name, rawIdea: s.idea }, systemToken);
    if (!create.ok || !create.data.success) { console.log(`  ✗ ${s.name}: creation failed — ${create.data.error || create.data.detail}`); continue; }
    const startupId = create.data.startup.id;

    await post(`/startups/${startupId}/confirm`, {}, systemToken);
    await post(`/startups/${startupId}/diagnose`, {}, systemToken);
    if (adminToken) await patch(`/admin/startups/${startupId}/verification`, { status: 'UNVERIFIED' }, adminToken);

    imported++;
    console.log(`  ✓ (${imported}/${startups.length}) ${s.name}`);
  }

  console.log(`\n=== Done. ${imported} real, current Product Hunt startups imported and discoverable. ===`);
}

run();
