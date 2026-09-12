require('dotenv').config();
/**
 * Why does every investor score the same against one venture?
 *
 * Reported: seven investors with wildly different theses (food-tech,
 * deep-tech, cybersecurity, health-tech) all scored 42% against a healthcare
 * venture, all labelled 'Adjacent', and none showed a thesis-specific reason.
 * Identical scores across different inputs means some dimension that should
 * differ is not differing.
 */
const pool = require('../backend/shared/db');

(async () => {
  const name = process.argv[2] || 'NeuraHealth';
  const s = await pool.query(`SELECT id, name, domain, stage FROM startups WHERE name = $1 LIMIT 1`, [name]);
  if (s.rows.length === 0) { console.log(`No venture named ${name}`); process.exit(1); }
  const startup = s.rows[0];
  console.log(`VENTURE: ${startup.name}`);
  console.log(`  domain: ${JSON.stringify(startup.domain)}`);
  console.log(`  stage:  ${startup.stage}\n`);

  const inv = await pool.query(
    `SELECT p.user_id, p.display_name, ip.thesis, ip.preferred_domains, ip.preferred_stages
     FROM investor_profiles ip JOIN profiles p ON p.id = ip.profile_id
     JOIN users u ON u.id = p.user_id
     WHERE u.primary_role = 'INVESTOR' AND p.visibility = 'DISCOVERABLE'
     ORDER BY p.display_name`
  );

  const { domainsMatch } = require('../backend/matching/matchingService');

  console.log(`INVESTORS: ${inv.rows.length}\n`);
  for (const i of inv.rows) {
    const idoms = (i.preferred_domains || []).map(d => d.toLowerCase().trim());
    const sdoms = (startup.domain || []).map(d => d.toLowerCase().trim());
    const overlap = idoms.filter(d => sdoms.some(sd => domainsMatch(d, sd)));

    const align = await pool.query(
      `SELECT score FROM alignment_scores WHERE user_id = $1 AND startup_id = $2`,
      [i.user_id, startup.id]
    );

    console.log(`  ${i.display_name}`);
    console.log(`    their domains: ${JSON.stringify(i.preferred_domains)}`);
    console.log(`    their stages:  ${JSON.stringify(i.preferred_stages)}`);
    console.log(`    DOMAIN OVERLAP: ${overlap.length > 0 ? overlap.join(', ') : 'NONE'}`);
    console.log(`    ALIGNMENT SCORED: ${align.rows.length > 0 ? Math.round(parseFloat(align.rows[0].score) * 100) + '%' : 'NOT SCORED'}`);
    console.log('');
  }

  const dupes = await pool.query(
    `SELECT p.display_name, COUNT(*) n FROM investor_profiles ip
     JOIN profiles p ON p.id = ip.profile_id
     GROUP BY p.display_name HAVING COUNT(*) > 1`
  );
  if (dupes.rows.length > 0) {
    console.log('DUPLICATE INVESTOR NAMES:');
    for (const d of dupes.rows) console.log(`  ${d.display_name} x${d.n}`);
  }

  await pool.end();
  process.exit(0);
})();
