require('dotenv').config();
/**
 * Why does THIS contributor see THESE opportunities?
 *
 * Reported from a real test: a backend engineer whose stated mission was
 * explicitly about health and civic stakes, with preferred domains
 * HealthTech and Climate, got EcoCharge (energy), LearnLoop (edtech, as a
 * UX/UI DESIGNER) and PayBridge (fintech). NeuraHealth, which is healthcare
 * at idea stage, did not appear at all.
 *
 * Two things to establish, without guessing:
 *   1. Do recommendation rows even EXIST for the healthcare ventures, or
 *      did the background re-rank never run / not finish?
 *   2. If they exist, what did they actually score, and why is a backend
 *      engineer scoring 36% on a UX/UI Designer gap?
 *
 * Usage: node scripts/diagnose-contributor-matches.js <email>
 */
const pool = require('../backend/shared/db');

(async () => {
  const email = process.argv[2];
  if (!email) { console.log('Usage: node scripts/diagnose-contributor-matches.js <email>'); process.exit(1); }

  const userRes = await pool.query(`SELECT id, primary_role FROM users WHERE email = $1`, [email]);
  if (userRes.rows.length === 0) { console.log(`No user with email ${email}`); process.exit(1); }
  const userId = userRes.rows[0].id;

  const prof = await pool.query(
    `SELECT p.display_name, p.headline, p.skills, cp.preferred_domains, cp.preferred_stage,
            cp.availability, cp.looking_for, (cp.motivation_embedding IS NOT NULL) AS has_motivation_embedding
     FROM profiles p LEFT JOIN contributor_profiles cp ON cp.profile_id = p.id
     WHERE p.user_id = $1`,
    [userId]
  );
  const p = prof.rows[0] || {};
  console.log('='.repeat(72));
  console.log(`CONTRIBUTOR: ${p.display_name} <${email}>`);
  console.log(`  headline: ${p.headline}`);
  console.log(`  skills: ${(p.skills || []).join(', ')}`);
  console.log(`  preferred domains: ${(p.preferred_domains || []).join(', ') || 'NONE'}`);
  console.log(`  preferred stages: ${(p.preferred_stage || []).join(', ') || 'NONE'}`);
  console.log(`  wrote a mission: ${p.looking_for ? 'YES' : 'NO'}`);
  console.log(`  mission embedding generated: ${p.has_motivation_embedding ? 'YES' : 'NO'}`);
  if (p.looking_for) console.log(`  mission text: "${p.looking_for.slice(0, 120)}..."`);

  const recs = await pool.query(
    `SELECT r.score, r.status, s.name AS startup, s.domain, g.role, g.seeking_type, r.explanation
     FROM recommendations r
     JOIN startups s ON s.id = r.startup_id
     JOIN gaps g ON g.id = r.source_gap_id
     WHERE r.target_user_id = $1 AND r.recommendation_type = 'CONTRIBUTOR'
     ORDER BY r.score DESC`,
    [userId]
  );

  console.log('\n' + '='.repeat(72));
  console.log(`ALL RECOMMENDATION ROWS THAT EXIST: ${recs.rows.length}`);
  console.log('(the UI hides anything under 0.20 and anything FILLED)\n');
  for (const r of recs.rows) {
    const shown = parseFloat(r.score) >= 0.20 && r.status === 'ACTIVE';
    console.log(`  ${shown ? 'SHOWN  ' : 'HIDDEN '} ${(parseFloat(r.score) * 100).toFixed(0).padStart(3)}%  ${r.startup} — ${r.role} (${r.seeking_type || 'CORE_HIRE'})`);
    console.log(`           domains: ${(r.domain || []).join(', ')}`);
    if (!shown) console.log(`           reason hidden: ${r.status !== 'ACTIVE' ? r.status : 'below 0.20 threshold'}`);
  }

  // Which real ventures have NO recommendation row for this user at all?
  const missing = await pool.query(
    `SELECT DISTINCT s.name, s.domain, g.role
     FROM gaps g
     JOIN startups s ON s.id = g.startup_id
     JOIN users u ON u.id = s.founder_id
     WHERE g.status NOT IN ('FILLED','DISMISSED')
       AND u.email != 'system.import@capforge.internal'
       AND s.verification_status != 'UNVERIFIED'
       AND NOT EXISTS (
         SELECT 1 FROM recommendations r
         WHERE r.source_gap_id = g.id AND r.target_user_id = $1
       )
     ORDER BY s.name`,
    [userId]
  );

  console.log('\n' + '='.repeat(72));
  console.log(`OPEN GAPS WITH NO RECOMMENDATION ROW AT ALL FOR THIS USER: ${missing.rows.length}`);
  console.log('(if healthcare ventures are in this list, the re-rank never covered them)\n');
  for (const m of missing.rows) {
    console.log(`  ${m.name} — ${m.role}  [${(m.domain || []).join(', ')}]`);
  }

  await pool.end();
  process.exit(0);
})();
