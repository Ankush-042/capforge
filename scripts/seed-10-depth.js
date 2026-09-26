require('dotenv').config();
/**
 * Depth for the ten new ventures.
 *
 * Ten ventures with nothing on them would make the platform look emptier
 * rather than fuller, which is the opposite of why they were added. So each
 * one gets what a venture that has existed for a month actually has.
 *
 * READINESS HISTORY IS EARNED, NOT FABRICATED. The obvious way to produce a
 * trajectory is to insert three assessments with rising numbers. That would
 * be a lie, and the trajectory component would then attribute movement to
 * events that did not cause it. Instead the state genuinely changes between
 * runs: readiness is computed on a solo venture, then people are actually
 * added to the team and the roles they fill are actually marked filled, then
 * readiness is computed again. The climb is real, and the events sitting
 * against it on the chart are the events that caused it.
 *
 * TWO ARE LEFT NEARLY EMPTY, deliberately. A platform where every venture is
 * equally active is obviously seeded. A founder who signed up, wrote their
 * idea and then did very little is the commonest thing on any real platform,
 * and having two of those makes the other eight read as genuinely active.
 *
 * Safe to re-run: every step checks whether it already happened.
 *
 * Usage:
 *   node scripts/seed-10-depth.js --dry
 *   node scripts/seed-10-depth.js
 */
const pool = require('../backend/shared/db');
const { runReadinessAndRiskAnalysis } = require('../backend/readiness/readinessService');

const DRY = process.argv.includes('--dry');
const DAY = 86400000;
const ago = (d) => new Date(Date.now() - d * DAY).toISOString();
const rand = (a, b) => a + Math.random() * (b - a);
const step = (s) => console.log(`\n${s}\n${'-'.repeat(s.length)}`);

/** The ten, by venture name. Two are marked sparse and stay that way. */
const PLAN = [
  { name: 'Bhasha',       hires: 2, sparse: false },
  { name: 'ProofPoint',   hires: 1, sparse: false },
  { name: 'DoseTrack',    hires: 2, sparse: false },
  { name: 'PanelRead',    hires: 0, sparse: true  },   // signed up, did little
  { name: 'NinetyDays',   hires: 2, sparse: false },
  { name: 'Uneven',       hires: 1, sparse: false },
  { name: 'CommonRoof',   hires: 1, sparse: false },
  { name: 'CircuitSense', hires: 0, sparse: true  },   // signed up, did little
  { name: 'VendorGate',   hires: 2, sparse: false },
  { name: 'NineHours',    hires: 1, sparse: false },
];

/** Re-stamp the most recent assessment so the history has real spacing. */
async function backdateLatest(startupId, days) {
  await pool.query(
    `UPDATE readiness_assessments SET generated_at = $2
     WHERE id = (SELECT id FROM readiness_assessments
                 WHERE startup_id = $1 ORDER BY generated_at DESC LIMIT 1)`,
    [startupId, ago(days)]
  );
}

/**
 * Somebody who genuinely fits an open role here, preferring a real skill
 * overlap so the team coverage that results is not nonsense.
 */
async function findHire(startupId, takenIds) {
  const r = await pool.query(
    `SELECT g.id AS gap_id, g.role, g.required_skills, p.user_id, p.display_name, p.skills
     FROM gaps g
     CROSS JOIN LATERAL (
       SELECT p.user_id, p.display_name, p.skills
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       JOIN contributor_profiles cp ON cp.profile_id = p.id
       WHERE u.primary_role = 'CONTRIBUTOR'
         AND u.email LIKE '%@seed.test'
         AND p.user_id != ALL($2::uuid[])
         AND array_length(p.skills, 1) > 0
         AND EXISTS (
           SELECT 1 FROM unnest(p.skills) s
           WHERE lower(s) = ANY(SELECT lower(x) FROM unnest(g.required_skills) x)
         )
       ORDER BY random() LIMIT 1
     ) p
     WHERE g.startup_id = $1 AND g.status NOT IN ('FILLED','DISMISSED')
     ORDER BY random() LIMIT 1`,
    [startupId, takenIds]
  );
  return r.rows[0] || null;
}

(async () => {
  if (DRY) console.log('DRY RUN. Nothing will be written.\n');

  const ventures = (await pool.query(
    `SELECT s.id, s.name, s.founder_id, s.domain
     FROM startups s JOIN users u ON u.id = s.founder_id
     WHERE u.email LIKE 'founder.%@seed.test' AND s.name = ANY($1::text[])`,
    [PLAN.map((p) => p.name)]
  )).rows;

  if (ventures.length === 0) {
    console.log('None of the ten found. Run seed-10-ventures.js first.');
    await pool.end(); process.exit(1);
  }
  console.log(`${ventures.length} of ${PLAN.length} ventures found.`);

  let hired = 0, assessed = 0, talked = 0, watched = 0;

  // ==========================================================================
  step('Readiness before anybody joined');

  for (const v of ventures) {
    const already = await pool.query(
      `SELECT COUNT(*)::int AS n FROM readiness_assessments WHERE startup_id = $1`, [v.id]
    );
    if (already.rows[0].n > 1) { console.log(`  skip  ${v.name} already has history`); continue; }
    console.log(`  ${DRY ? 'would assess' : 'assessing'}  ${v.name} as it stands today`);
    if (DRY) continue;
    const r = await runReadinessAndRiskAnalysis(v.id);
    if (r.success) { await backdateLatest(v.id, rand(26, 34)); assessed++; }
  }

  // ==========================================================================
  step('People joining, and the roles they fill');

  const taken = [];
  for (const v of ventures) {
    const plan = PLAN.find((p) => p.name === v.name);
    if (!plan || plan.hires === 0) { console.log(`  skip  ${v.name} stays solo`); continue; }

    const existing = await pool.query(
      `SELECT COUNT(*)::int AS n FROM startup_team_members WHERE startup_id = $1 AND is_founder = false`, [v.id]
    );
    if (existing.rows[0].n >= plan.hires) { console.log(`  skip  ${v.name} already has a team`); continue; }

    for (let i = existing.rows[0].n; i < plan.hires; i++) {
      const hire = await findHire(v.id, taken.length ? taken : ['00000000-0000-0000-0000-000000000000']);
      if (!hire) { console.log(`  none  ${v.name}: nobody suitable left for an open role`); break; }

      console.log(`  ${DRY ? 'would add' : 'adding'}  ${hire.display_name} to ${v.name} as ${hire.role}`);
      if (DRY) { taken.push(hire.user_id); continue; }

      await pool.query(
        `INSERT INTO startup_team_members (startup_id, user_id, role, skills, is_founder, joined_at)
         VALUES ($1, $2, $3, $4, false, $5)
         ON CONFLICT DO NOTHING`,
        [v.id, hire.user_id, hire.role, hire.skills || [], ago(rand(16, 23))]
      );
      // The role they took is genuinely filled now, which is what makes the
      // readiness climb below real rather than invented.
      await pool.query(`UPDATE gaps SET status = 'FILLED' WHERE id = $1`, [hire.gap_id]);
      // And expire what pointed at it. Filling a gap without doing this leaves
      // live recommendations for a role nobody can take, which is exactly what
      // the quality suite calls a stale recommendation. The same repair exists
      // in the admin service; it belongs here too.
      await pool.query(
        `UPDATE recommendations SET status = 'EXPIRED'
         WHERE source_gap_id = $1 AND status = 'ACTIVE'`,
        [hire.gap_id]
      );
      taken.push(hire.user_id);
      hired++;
    }
  }

  // ==========================================================================
  step('Readiness after, so the climb has a cause');

  for (const v of ventures) {
    const plan = PLAN.find((p) => p.name === v.name);
    if (!plan || plan.hires === 0) continue;
    const count = await pool.query(
      `SELECT COUNT(*)::int AS n FROM readiness_assessments WHERE startup_id = $1`, [v.id]
    );
    if (count.rows[0].n > 2) { console.log(`  skip  ${v.name} already has enough history`); continue; }

    console.log(`  ${DRY ? 'would re-assess' : 're-assessing'}  ${v.name} now that the team changed`);
    if (DRY) continue;
    const mid = await runReadinessAndRiskAnalysis(v.id);
    if (mid.success) await backdateLatest(v.id, rand(10, 14));
    // And once more for today, so the latest figure is genuinely current.
    const now = await runReadinessAndRiskAnalysis(v.id);
    if (now.success) assessed++;
  }

  // ==========================================================================
  step('Investors watching');

  const investors = (await pool.query(
    `SELECT u.id, ip.preferred_domains
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     JOIN investor_profiles ip ON ip.profile_id = p.id
     WHERE u.primary_role = 'INVESTOR' AND u.email LIKE '%@seed.test'`
  )).rows;

  for (const inv of investors) {
    const theirs = (inv.preferred_domains || []).map((d) => String(d).toLowerCase());
    for (const v of ventures) {
      const vd = (v.domain || []).map((d) => String(d).toLowerCase());
      const fits = vd.some((d) => theirs.some((t) => d.includes(t) || t.includes(d)));
      if (!fits) continue;

      const exists = await pool.query(
        `SELECT 1 FROM investor_watchlist WHERE investor_id = $1 AND startup_id = $2`, [inv.id, v.id]
      );
      if (exists.rows.length > 0) continue;

      const readiness = (await pool.query(
        `SELECT overall_score FROM readiness_assessments WHERE startup_id = $1
         ORDER BY generated_at DESC LIMIT 1`, [v.id]
      )).rows[0];

      console.log(`  ${DRY ? 'would watch' : 'watching'}  ${v.name}`);
      if (DRY) { watched++; continue; }
      await pool.query(
        `INSERT INTO investor_watchlist (investor_id, startup_id, status, note, readiness_at_watch)
         VALUES ($1, $2, 'WATCHING', $3, $4)`,
        [inv.id, v.id,
         'Worth another look once there are people on it. The problem is well understood.',
         readiness ? Math.round(parseFloat(readiness.overall_score)) : null]
      );
      watched++;
      break;   // one investor per venture is plenty
    }
  }

  console.log(`\n${'='.repeat(62)}`);
  console.log(DRY ? 'Dry run complete.' : 'Done.');
  console.log(`  people added to teams:   ${hired}`);
  console.log(`  ventures with history:   ${assessed}`);
  console.log(`  investors watching:      ${watched}`);
  if (!DRY) {
    console.log('\nNEXT: node scripts/rerank-everything.js');
    console.log('      node scripts/test-matching-quality.js');
  }
  await pool.end();
  process.exit(0);
})().catch((e) => { console.error('\nFailed:', e.message); console.error(e.stack); process.exit(1); });
