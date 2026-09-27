require('dotenv').config();
/**
 * What domain label each venture actually carries, and whether a contributor
 * choosing a field would find it.
 *
 * The AI structuring step assigns these labels freely, so a solar venture can
 * come back as "renewable energy" and never match somebody who chose
 * "climate". That is invisible until a real person selects a field and a
 * venture they would obviously want is missing.
 */
const pool = require('../backend/shared/db');
const { domainsMatch } = require('../backend/matching/matchingService');

// The twelve the profile picker offers.
const PICKER = ['healthtech', 'fintech', 'edtech', 'climate', 'saas', 'cybersecurity',
                'logistics', 'proptech', 'hr tech', 'legal tech', 'biotech', 'creator economy'];

(async () => {
  const ventures = (await pool.query(
    `SELECT s.name, s.domain FROM startups s
     WHERE s.verification_status != 'UNVERIFIED' ORDER BY s.name`
  )).rows;

  console.log(`${ventures.length} ventures\n`);
  const reach = {};
  for (const f of PICKER) reach[f] = [];
  const orphans = [];

  for (const v of ventures) {
    const labels = (v.domain || []).map((d) => String(d).toLowerCase().trim());
    const hits = PICKER.filter((f) => labels.some((l) => domainsMatch(f, l)));
    for (const h of hits) reach[h].push(v.name);
    if (hits.length === 0) orphans.push({ name: v.name, labels });
    console.log(`  ${v.name.slice(0, 26).padEnd(28)} ${labels.join(' · ')}`);
    if (hits.length === 0) console.log(`  ${''.padEnd(28)} ^ MATCHES NO FIELD IN THE PICKER`);
  }

  console.log(`\n${'='.repeat(64)}\nWhat a contributor sees when they choose each field:\n`);
  for (const f of PICKER) {
    const n = reach[f].length;
    const flag = n === 0 ? '  <- NOTHING' : n === 1 ? '  <- only one' : '';
    console.log(`  ${f.padEnd(18)} ${String(n).padStart(2)}${flag}`);
    if (n > 0 && n <= 4) console.log(`  ${''.padEnd(18)} ${reach[f].join(', ')}`);
  }

  if (orphans.length > 0) {
    console.log(`\n${orphans.length} venture(s) reachable from NO field in the picker:`);
    for (const o of orphans) console.log(`  ${o.name} — ${o.labels.join(' · ')}`);
    console.log('\nThese exist and nobody browsing by field will ever see them.');
  }

  await pool.end();
  process.exit(0);
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
