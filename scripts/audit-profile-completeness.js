require('dotenv').config();
/**
 * What is actually empty across every seeded account?
 *
 * Before filling anything, establish the real state. Empty fields are the
 * reason matching underperforms: a contributor with no preferred_domains
 * scores 0 on domain for every venture, and a venture with no
 * founder_vision has a null vision alignment against everyone.
 */
const pool = require('../backend/shared/db');

(async () => {
  const startups = await pool.query(
    `SELECT s.name, u.email,
            (s.founder_vision IS NULL OR trim(s.founder_vision) = '') AS no_vision,
            (s.vision_embedding IS NULL) AS no_vision_embedding,
            (s.problem IS NULL OR trim(s.problem) = '') AS no_problem,
            (s.solution IS NULL OR trim(s.solution) = '') AS no_solution,
            (s.domain IS NULL OR cardinality(s.domain) = 0) AS no_domain,
            (s.target_users IS NULL OR cardinality(s.target_users) = 0) AS no_target_users
     FROM startups s JOIN users u ON u.id = s.founder_id
     WHERE u.email != 'system.import@capforge.internal' AND s.verification_status != 'UNVERIFIED'
     ORDER BY s.name`
  );

  console.log('='.repeat(74));
  console.log(`REAL VENTURES: ${startups.rows.length}`);
  let vMissing = 0;
  for (const s of startups.rows) {
    const gaps = [];
    if (s.no_vision) { gaps.push('founder_vision'); vMissing++; }
    if (!s.no_vision && s.no_vision_embedding) gaps.push('vision_embedding');
    if (s.no_problem) gaps.push('problem');
    if (s.no_solution) gaps.push('solution');
    if (s.no_domain) gaps.push('domain');
    if (s.no_target_users) gaps.push('target_users');
    console.log(`  ${gaps.length === 0 ? 'COMPLETE' : 'MISSING '} ${s.name}`);
    if (gaps.length) console.log(`             -> ${gaps.join(', ')}`);
  }
  console.log(`\n  ${vMissing}/${startups.rows.length} ventures have NO founder_vision (so vision alignment is null for everyone against them)`);

  const contribs = await pool.query(
    `SELECT p.display_name, u.email,
            (p.headline IS NULL OR trim(p.headline) = '') AS no_headline,
            (p.bio IS NULL OR trim(p.bio) = '') AS no_bio,
            (p.skills IS NULL OR cardinality(p.skills) = 0) AS no_skills,
            (cp.id IS NULL) AS no_contrib_row,
            (cp.looking_for IS NULL OR trim(cp.looking_for) = '') AS no_mission,
            (cp.motivation_embedding IS NULL) AS no_mission_embedding,
            (cp.preferred_domains IS NULL OR cardinality(cp.preferred_domains) = 0) AS no_domains,
            (cp.preferred_stage IS NULL OR cardinality(cp.preferred_stage) = 0) AS no_stages,
            (cp.availability IS NULL) AS no_availability,
            (cp.experience_years IS NULL) AS no_experience
     FROM profiles p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN contributor_profiles cp ON cp.profile_id = p.id
     WHERE u.primary_role = 'CONTRIBUTOR' AND u.email LIKE '%@seed.test'
     ORDER BY p.display_name`
  );

  console.log('\n' + '='.repeat(74));
  console.log(`SEEDED CONTRIBUTORS: ${contribs.rows.length}`);
  const counts = { mission: 0, domains: 0, stages: 0, bio: 0, experience: 0, embedding: 0 };
  for (const c of contribs.rows) {
    const gaps = [];
    if (c.no_headline) gaps.push('headline');
    if (c.no_bio) { gaps.push('bio'); counts.bio++; }
    if (c.no_skills) gaps.push('skills');
    if (c.no_contrib_row) gaps.push('CONTRIBUTOR ROW MISSING ENTIRELY');
    if (c.no_mission) { gaps.push('looking_for'); counts.mission++; }
    if (!c.no_mission && c.no_mission_embedding) { gaps.push('motivation_embedding'); counts.embedding++; }
    if (c.no_domains) { gaps.push('preferred_domains'); counts.domains++; }
    if (c.no_stages) { gaps.push('preferred_stage'); counts.stages++; }
    if (c.no_availability) gaps.push('availability');
    if (c.no_experience) { gaps.push('experience_years'); counts.experience++; }
    console.log(`  ${gaps.length === 0 ? 'COMPLETE' : 'MISSING '} ${c.display_name} <${c.email}>`);
    if (gaps.length) console.log(`             -> ${gaps.join(', ')}`);
  }
  console.log(`\n  no mission text: ${counts.mission}/${contribs.rows.length}`);
  console.log(`  no preferred_domains: ${counts.domains}/${contribs.rows.length}  <- scores 0 on domain against EVERY venture`);
  console.log(`  no preferred_stage: ${counts.stages}/${contribs.rows.length}`);
  console.log(`  no bio: ${counts.bio}/${contribs.rows.length}`);

  const investors = await pool.query(
    `SELECT p.display_name, u.email,
            (p.headline IS NULL OR trim(p.headline) = '') AS no_headline,
            (p.bio IS NULL OR trim(p.bio) = '') AS no_bio,
            (ip.id IS NULL) AS no_investor_row,
            (ip.thesis IS NULL OR trim(ip.thesis) = '') AS no_thesis,
            (ip.preferred_domains IS NULL OR cardinality(ip.preferred_domains) = 0) AS no_domains,
            (ip.preferred_stages IS NULL OR cardinality(ip.preferred_stages) = 0) AS no_stages,
            (ip.ticket_min IS NULL) AS no_ticket
     FROM profiles p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN investor_profiles ip ON ip.profile_id = p.id
     WHERE u.primary_role = 'INVESTOR' AND u.email LIKE '%@seed.test'
     ORDER BY p.display_name`
  );

  console.log('\n' + '='.repeat(74));
  console.log(`SEEDED INVESTORS: ${investors.rows.length}`);
  for (const i of investors.rows) {
    const gaps = [];
    if (i.no_headline) gaps.push('headline');
    if (i.no_bio) gaps.push('bio');
    if (i.no_investor_row) gaps.push('INVESTOR ROW MISSING ENTIRELY');
    if (i.no_thesis) gaps.push('thesis');
    if (i.no_domains) gaps.push('preferred_domains');
    if (i.no_stages) gaps.push('preferred_stages');
    if (i.no_ticket) gaps.push('ticket_min/max');
    console.log(`  ${gaps.length === 0 ? 'COMPLETE' : 'MISSING '} ${i.display_name} <${i.email}>`);
    if (gaps.length) console.log(`             -> ${gaps.join(', ')}`);
  }

  console.log('\n' + '='.repeat(74));
  await pool.end();
  process.exit(0);
})();
