/**
 * Phase 7 (part 2) — expanding the contributor pool for real matching
 * depth. 25 more contributors, genuinely varied skill/domain
 * combinations not already covered by the original 12 (blockchain,
 * AR/VR, QA, cloud infra, biomedical, supply chain, and more).
 * Run: node scripts/expand-contributor-pool.js
 */
const BASE = 'http://localhost:3000/api';
const PASSWORD = 'SeedPass123!';

const CONTRIBUTORS = [
  { email: 'c2.tanvi@seed.test', name: 'Tanvi Reddy', headline: 'Blockchain Engineer', skills: ['solidity', 'smart contracts', 'web3'], exp: 3, avail: 'full-time', stages: ['idea', 'prototype'], domains: ['fintech'] },
  { email: 'c2.omar@seed.test', name: 'Omar Farooqi', headline: 'AR/VR Engineer', skills: ['unity', 'spatial computing', '3d graphics'], exp: 4, avail: 'full-time', stages: ['prototype', 'mvp'], domains: ['edtech', 'healthtech'] },
  { email: 'c2.lisa@seed.test', name: 'Lisa Wong', headline: 'QA Engineer', skills: ['test automation', 'quality assurance', 'ci/cd'], exp: 5, avail: 'part-time', stages: ['mvp', 'early traction'], domains: ['saas'] },
  { email: 'c2.dev@seed.test', name: 'Dev Patel', headline: 'Cloud Infrastructure Architect', skills: ['aws', 'terraform', 'kubernetes'], exp: 6, avail: 'full-time', stages: ['seed'], domains: ['fintech', 'saas'] },
  { email: 'c2.simran@seed.test', name: 'Simran Kaur', headline: 'Biomedical Engineer', skills: ['medical devices', 'regulatory affairs', 'clinical validation'], exp: 5, avail: 'part-time', stages: ['idea', 'prototype'], domains: ['healthtech'] },
  { email: 'c2.wei@seed.test', name: 'Wei Zhang', headline: 'Supply Chain Analyst', skills: ['logistics optimization', 'demand forecasting', 'route optimization'], exp: 4, avail: 'full-time', stages: ['idea', 'pre-seed'], domains: ['logistics'] },
  { email: 'c2.fatima@seed.test', name: 'Fatima Sheikh', headline: 'Product Manager', skills: ['product strategy', 'roadmapping', 'user research'], exp: 5, avail: 'full-time', stages: ['mvp', 'early traction'], domains: ['healthtech', 'edtech'] },
  { email: 'c2.carlos@seed.test', name: 'Carlos Mendez', headline: 'Data Scientist', skills: ['machine learning', 'statistical modeling', 'python'], exp: 4, avail: 'full-time', stages: ['seed'], domains: ['climate'] },
  { email: 'c2.aisha@seed.test', name: 'Aisha Bello', headline: 'Content Strategist', skills: ['content marketing', 'seo', 'brand voice'], exp: 3, avail: 'part-time', stages: ['mvp'], domains: ['saas', 'edtech'] },
  { email: 'c2.rohit@seed.test', name: 'Rohit Sharma', headline: 'Embedded Systems Engineer', skills: ['embedded systems', 'firmware', 'iot'], exp: 6, avail: 'full-time', stages: ['prototype', 'mvp'], domains: ['climate'] },
  { email: 'c2.grace@seed.test', name: 'Grace Kim', headline: 'UX Writer', skills: ['ux writing', 'microcopy', 'design systems'], exp: 3, avail: 'part-time', stages: ['idea', 'prototype'], domains: ['fintech', 'healthtech'] },
  { email: 'c2.imran@seed.test', name: 'Imran Qureshi', headline: 'Compliance Specialist', skills: ['compliance systems', 'regulatory reporting', 'aml/kyc'], exp: 7, avail: 'advisor', stages: ['seed', 'early traction'], domains: ['fintech'] },
  { email: 'c2.nina@seed.test', name: 'Nina Petrova', headline: 'Growth Engineer', skills: ['a/b testing', 'analytics instrumentation', 'react'], exp: 3, avail: 'full-time', stages: ['mvp', 'early traction'], domains: ['saas'] },
  { email: 'c2.samuel@seed.test', name: 'Samuel Osei', headline: 'Agricultural Technologist', skills: ['precision agriculture', 'remote sensing', 'gis'], exp: 4, avail: 'full-time', stages: ['idea', 'prototype'], domains: ['climate', 'logistics'] },
  { email: 'c2.priyanka@seed.test', name: 'Priyanka Joshi', headline: 'Frontend Engineer', skills: ['react', 'typescript', 'accessibility'], exp: 3, avail: 'full-time', stages: ['idea', 'prototype'], domains: ['edtech', 'healthtech'] },
  { email: 'c2.jamal@seed.test', name: 'Jamal Ibrahim', headline: 'Sales Engineer', skills: ['technical sales', 'solution architecture', 'b2b sales'], exp: 5, avail: 'full-time', stages: ['seed', 'early traction'], domains: ['saas', 'fintech'] },
  { email: 'c2.elena@seed.test', name: 'Elena Popescu', headline: 'Data Privacy Officer', skills: ['data privacy', 'gdpr compliance', 'security policy'], exp: 6, avail: 'advisor', stages: ['seed'], domains: ['healthtech', 'fintech'] },
  { email: 'c2.harish@seed.test', name: 'Harish Nair', headline: 'Site Reliability Engineer', skills: ['sre', 'monitoring', 'incident response'], exp: 4, avail: 'full-time', stages: ['mvp', 'early traction'], domains: ['saas', 'fintech'] },
  { email: 'c2.mei@seed.test', name: 'Mei Lin', headline: 'Instructional Designer', skills: ['curriculum design', 'learning science', 'edtech content'], exp: 5, avail: 'part-time', stages: ['idea', 'prototype'], domains: ['edtech'] },
  { email: 'c2.victor@seed.test', name: 'Victor Alves', headline: 'Hardware Engineer', skills: ['pcb design', 'electrical engineering', 'prototyping'], exp: 5, avail: 'full-time', stages: ['prototype', 'mvp'], domains: ['climate'] },
  { email: 'c2.zara@seed.test', name: 'Zara Ahmed', headline: 'Community Manager', skills: ['community building', 'social media', 'partnerships'], exp: 2, avail: 'part-time', stages: ['mvp', 'early traction'], domains: ['edtech', 'saas'] },
  { email: 'c2.thabo@seed.test', name: 'Thabo Mokoena', headline: 'Machine Learning Engineer', skills: ['computer vision', 'model deployment', 'mlops'], exp: 4, avail: 'full-time', stages: ['prototype', 'mvp'], domains: ['healthtech', 'logistics'] },
  { email: 'c2.isabella@seed.test', name: 'Isabella Conti', headline: 'Finance & Operations Lead', skills: ['financial modeling', 'fundraising support', 'operations'], exp: 6, avail: 'part-time', stages: ['seed', 'early traction'], domains: ['fintech', 'climate'] },
  { email: 'c2.arvind@seed.test', name: 'Arvind Rao', headline: 'Backend Engineer', skills: ['node.js', 'distributed systems', 'postgresql'], exp: 5, avail: 'full-time', stages: ['mvp'], domains: ['logistics', 'fintech'] },
  { email: 'c2.sofia@seed.test', name: 'Sofia Kowalski', headline: 'Design Researcher', skills: ['user research', 'usability testing', 'design thinking'], exp: 3, avail: 'part-time', stages: ['idea', 'prototype'], domains: ['healthtech', 'climate'] },
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
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log(`=== Expanding contributor pool: ${CONTRIBUTORS.length} more, genuinely varied ===\n`);
  for (const c of CONTRIBUTORS) {
    await sleep(3200); // stay comfortably under the 20/min auth rate limit
    const reg = await post('/auth/register', { email: c.email, password: PASSWORD, primaryRole: 'CONTRIBUTOR', displayName: c.name });
    if (!reg.ok) { console.log(`  ✗ ${c.name}: registration failed — ${reg.data.error}`); continue; }
    const token = reg.data.token;

    await patch('/profiles/me', { headline: c.headline, skills: c.skills }, token);
    await post('/profiles/contributor', { availability: c.avail, preferredStage: c.stages, preferredDomains: c.domains, experienceYears: c.exp }, token);
    console.log(`  ✓ ${c.name} (${c.headline})`);
  }
  console.log('\n=== Done. Contributor pool expanded. ===');
}

run();
