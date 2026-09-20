require('dotenv').config();
/**
 * Why did this person match nothing?
 *
 * Three fixes have been made by reasoning about this from the code. That was
 * two fixes too many. This prints what ACTUALLY happens for one real person
 * against every real gap: every score component, whether they passed the
 * evidence filter, and if not, exactly which test they failed.
 *
 * Usage: node scripts/why-no-matches.js <email>
 */
const pool = require('../backend/shared/db');
const { scoreCandidate } = require('../backend/matching/matchingService');

(async () => {
  const email = process.argv[2];
  if (!email) { console.log('Usage: node scripts/why-no-matches.js <email>'); process.exit(1); }

  const me = (await pool.query(
    `SELECT u.id AS user_id, p.headline, p.skills, p.bio, p.visibility,
            p.embedding IS NOT NULL AS has_embedding,
            cp.preferred_domains, cp.preferred_stage, cp.availability,
            cp.experience_years, cp.looking_for
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     LEFT JOIN contributor_profiles cp ON cp.profile_id = p.id
     WHERE lower(trim(u.email)) = $1`,
    [email.trim().toLowerCase()]
  )).rows[0];

  if (!me) { console.log(`No account for ${email}`); await pool.end(); process.exit(1); }

  console.log('\nTHE PERSON');
  console.log(`  headline      ${me.headline || '(none)'}`);
  console.log(`  skills        ${JSON.stringify(me.skills || [])}`);
  console.log(`  bio           ${me.bio ? me.bio.slice(0, 60) + '...' : '(empty)'}`);
  console.log(`  domains       ${JSON.stringify(me.preferred_domains || [])}`);
  console.log(`  stages        ${JSON.stringify(me.preferred_stage || [])}`);
  console.log(`  visibility    ${me.visibility}`);
  console.log(`  has embedding ${me.has_embedding}`);
  console.log(`  mission       ${me.looking_for ? me.looking_for.slice(0, 70) + '...' : '(none)'}`);

  if (!me.has_embedding) {
    console.log('\n  >> NO EMBEDDING. Semantic similarity will be null for every gap,');
    console.log('     so only literal skill overlap can produce a match.');
  }

  const gaps = (await pool.query(
    `SELECT g.*, s.name AS startup_name, s.domain AS s_domain, s.stage AS s_stage,
            s.id AS s_id, s.founder_id AS s_founder_id,
            CASE WHEN g.embedding IS NOT NULL THEN true ELSE false END AS gap_has_embedding
     FROM gaps g
     JOIN startups s ON s.id = g.startup_id
     JOIN users u ON u.id = s.founder_id
     WHERE g.status NOT IN ('FILLED','DISMISSED')
       AND u.email != 'system.import@capforge.internal'
       AND s.verification_status != 'UNVERIFIED'
     ORDER BY s.name, g.role`
  )).rows;

  console.log(`\n${gaps.length} OPEN ROLES ON THE PLATFORM\n`);
  console.log('  score  evid  role                                venture');
  console.log('  ' + '-'.repeat(76));

  let passed = 0;
  const nearMisses = [];

  for (const g of gaps) {
    const startup = { id: g.s_id, name: g.startup_name, domain: g.s_domain, stage: g.s_stage, founder_id: g.s_founder_id };
    const { score, breakdown, overlap } = scoreCandidate(g, startup, { ...me, semantic_similarity: null }, 0);

    const hasEvidence = overlap.length > 0
      || (breakdown.semanticSimilarity !== null && breakdown.semanticSimilarity >= 0.5);

    const pct = Math.round(score * 100);
    if (hasEvidence && score >= 0.20) passed++;

    const mark = hasEvidence ? (score >= 0.20 ? 'YES ' : 'low ') : 'NO  ';
    console.log(`  ${String(pct).padStart(4)}%  ${mark}  ${String(g.role).slice(0, 34).padEnd(34)}  ${g.startup_name}`);

    const focus = process.argv[3];
    if (focus && String(g.startup_name).toLowerCase().includes(focus.toLowerCase())) {
      nearMisses.push({ g, score: pct, breakdown, overlap });
    } else if (!focus && !hasEvidence && score >= 0.16) {
      nearMisses.push({ g, score: pct, breakdown, overlap });
    }
  }

  console.log(`\n  ${passed} role(s) would actually be shown to this person.`);

  if (nearMisses.length > 0) {
    console.log(`\n${nearMisses.length} ROLE(S) IN DETAIL`);
    console.log('These are the ones worth arguing about.\n');
    for (const n of nearMisses.slice(0, 6)) {
      console.log(`  ${n.g.startup_name} — ${n.g.role}  (${n.score}%)`);
      console.log(`     role fit        ${Math.round((n.breakdown.roleFit ?? 0) * 100)}%`);
      console.log(`     skill fit       ${Math.round((n.breakdown.skillFit ?? 0) * 100)}%`);
      console.log(`     domain fit      ${Math.round((n.breakdown.domainFit ?? 0) * 100)}%`);
      console.log(`     stage fit       ${Math.round((n.breakdown.stageFit ?? 0) * 100)}%`);
      console.log(`     experience fit  ${Math.round((n.breakdown.experienceFit ?? 0) * 100)}%`);
      console.log(`     semantic sim    ${n.breakdown.semanticSimilarity === null || n.breakdown.semanticSimilarity === undefined ? 'null (no gap embedding)' : Math.round(n.breakdown.semanticSimilarity * 100) + '%'}`);
      console.log(`     gap embedding   ${n.g.gap_has_embedding}`);
      console.log(`     alignment       ${n.breakdown.alignmentFit === null || n.breakdown.alignmentFit === undefined ? 'not scored' : Math.round(n.breakdown.alignmentFit * 100) + '%'}`);
      console.log(`     skills required ${JSON.stringify(n.g.required_skills || [])}`);
      console.log(`     literal overlap ${JSON.stringify(n.overlap)}  <- empty is why it was filtered`);
      console.log('');
    }
  }

  await pool.end();
  process.exit(0);
})().catch(e => { console.error('Failed:', e.message); process.exit(1); });
