require('dotenv').config();
/**
 * Matching quality tests.
 *
 * This exists so "most relevant" is a definition that passes or fails, not
 * an opinion. Every case below asserts something a person would consider
 * obviously correct. If the engine cannot satisfy these, it is not ready,
 * regardless of how good the internals look.
 *
 * Run after ANY change to matching:  node scripts/test-matching-quality.js
 */
const pool = require('../backend/shared/db');

const RULES = [
  // --- CONTRIBUTOR SIDE: role correctness ---
  {
    name: 'Backend engineers are not top-matched to design roles',
    async check() {
      const r = await pool.query(
        `SELECT p.display_name, g.role, rec.score
         FROM recommendations rec
         JOIN profiles p ON p.user_id = rec.target_user_id
         JOIN gaps g ON g.id = rec.source_gap_id
         WHERE rec.status = 'ACTIVE' AND rec.recommendation_type = 'CONTRIBUTOR'
           AND lower(p.headline) LIKE '%backend%'
           AND (lower(g.role) LIKE '%design%' OR lower(g.role) LIKE '%ux%' OR lower(g.role) LIKE '%ui%')
           AND rec.score >= 0.30
         ORDER BY rec.score DESC LIMIT 5`
      );
      return {
        pass: r.rows.length === 0,
        detail: r.rows.length === 0
          ? 'no backend engineer scores 30%+ on a design role'
          : r.rows.map(x => `${x.display_name} -> ${x.role} at ${Math.round(x.score * 100)}%`).join('; '),
      };
    },
  },
  {
    name: 'Designers are not top-matched to backend roles',
    async check() {
      const r = await pool.query(
        `SELECT p.display_name, g.role, rec.score
         FROM recommendations rec
         JOIN profiles p ON p.user_id = rec.target_user_id
         JOIN gaps g ON g.id = rec.source_gap_id
         WHERE rec.status = 'ACTIVE' AND rec.recommendation_type = 'CONTRIBUTOR'
           AND (lower(p.headline) LIKE '%designer%' OR lower(p.headline) LIKE '%ux%')
           AND (lower(g.role) LIKE '%backend%' OR lower(g.role) LIKE '%devops%')
           AND rec.score >= 0.30
         ORDER BY rec.score DESC LIMIT 5`
      );
      return {
        pass: r.rows.length === 0,
        detail: r.rows.length === 0
          ? 'no designer scores 30%+ on a backend or devops role'
          : r.rows.map(x => `${x.display_name} -> ${x.role} at ${Math.round(x.score * 100)}%`).join('; '),
      };
    },
  },
  {
    name: "Every gap's top candidate has a genuinely matching role or real skill overlap",
    async check() {
      const r = await pool.query(
        `SELECT DISTINCT ON (g.id) s.name AS startup, g.role, p.headline, rec.score,
                (rec.score_breakdown->>'roleFit')::float AS role_fit,
                (rec.score_breakdown->>'skillFit')::float AS skill_fit
         FROM recommendations rec
         JOIN gaps g ON g.id = rec.source_gap_id
         JOIN startups s ON s.id = g.startup_id
         JOIN profiles p ON p.user_id = rec.target_user_id
         WHERE rec.status = 'ACTIVE' AND rec.recommendation_type = 'CONTRIBUTOR'
         ORDER BY g.id, rec.score DESC`
      );
      // The top candidate for a gap must have either a real role match or
      // meaningful skill overlap. Neither means the ranking is noise.
      // A weak top candidate is acceptable IF the score is honestly low: it
      // means "nobody strong is available yet", which is true and useful.
      // What is NOT acceptable is a weak candidate presented as a strong
      // match. So the rule is: no gap may show a 40%+ top candidate who has
      // neither a real role fit nor real skill overlap.
      const bad = r.rows.filter(x =>
        (x.role_fit || 0) < 0.5 && (x.skill_fit || 0) < 0.30 && (x.score || 0) >= 0.40
      );
      return {
        pass: bad.length === 0,
        detail: bad.length === 0
          ? `all ${r.rows.length} gaps: no unjustified high-scoring top candidate`
          : bad.slice(0, 5).map(x => `${x.startup}/${x.role}: top is "${x.headline}" at ${Math.round(x.score*100)}% (role ${Math.round((x.role_fit||0)*100)}%, skill ${Math.round((x.skill_fit||0)*100)}%)`).join('; '),
      };
    },
  },
  {
    name: 'No duplicate role rows for the same venture',
    async check() {
      // Group by startup_id, not name. The first version grouped by name, so
      // two DIFFERENT ventures that happen to share a name looked like
      // duplicate gaps, which is a different problem entirely.
      const r = await pool.query(
        `SELECT s.name, g.role, COUNT(*) AS n
         FROM gaps g JOIN startups s ON s.id = g.startup_id
         GROUP BY g.startup_id, s.name, lower(trim(g.role)), g.role HAVING COUNT(*) > 1`
      );
      return {
        pass: r.rows.length === 0,
        detail: r.rows.length === 0 ? 'no duplicate gaps' : r.rows.map(x => `${x.name}/${x.role} x${x.n}`).join('; '),
      };
    },
  },
  {
    name: 'No recommendations point at filled or dismissed gaps',
    async check() {
      const r = await pool.query(
        `SELECT COUNT(*) AS n FROM recommendations rec
         JOIN gaps g ON g.id = rec.source_gap_id
         WHERE rec.status = 'ACTIVE' AND g.status IN ('FILLED','DISMISSED')`
      );
      const n = parseInt(r.rows[0].n);
      return { pass: n === 0, detail: n === 0 ? 'clean' : `${n} stale recommendations` };
    },
  },
  {
    name: 'No unverified or system-import ventures leak into recommendations',
    async check() {
      const r = await pool.query(
        `SELECT COUNT(*) AS n FROM recommendations rec
         JOIN startups s ON s.id = rec.startup_id
         JOIN users u ON u.id = s.founder_id
         WHERE rec.status = 'ACTIVE'
           AND (u.email = 'system.import@capforge.internal' OR s.verification_status = 'UNVERIFIED')`
      );
      const n = parseInt(r.rows[0].n);
      return { pass: n === 0, detail: n === 0 ? 'clean' : `${n} leaked` };
    },
  },
  {
    name: 'Every shown recommendation has a real explanation',
    async check() {
      const r = await pool.query(
        `SELECT COUNT(*) AS n FROM recommendations
         WHERE status = 'ACTIVE' AND score >= 0.20
           AND (explanation IS NULL OR explanation::text = 'null' OR explanation::text = '{}')`
      );
      const n = parseInt(r.rows[0].n);
      return { pass: n === 0, detail: n === 0 ? 'all explained' : `${n} with no explanation` };
    },
  },

  {
    name: 'No two ventures share the same name',
    async check() {
      // Scoped to REAL ventures. Both 'OP.GG for Time Takers' rows are owned
      // by system.import@capforge.internal: scraped imports that are already
      // excluded from every matching path. Duplicates among those are
      // harmless noise in a staging table, not a matching problem, and
      // deleting scraped rows to make a test green would be theatre.
      const r = await pool.query(
        `SELECT s.name, COUNT(*) AS n
         FROM startups s JOIN users u ON u.id = s.founder_id
         WHERE u.email != 'system.import@capforge.internal'
           AND s.verification_status != 'UNVERIFIED'
         GROUP BY lower(trim(s.name)), s.name HAVING COUNT(*) > 1`
      );
      return {
        pass: r.rows.length === 0,
        detail: r.rows.length === 0
          ? 'all venture names unique'
          : r.rows.map(x => `"${x.name}" x${x.n}`).join('; ') + ' — duplicate ventures, not duplicate gaps',
      };
    },
  },

  {
    name: 'No explanation claims a role match the profile no longer supports',
    async check() {
      // Catches the stale-row bug directly: a recommendation asserting
      // roleFit 1.0 must correspond to a headline that STILL equals the gap
      // role. Anything else is an explanation describing a person who has
      // since changed.
      const r = await pool.query(
        `SELECT p.display_name, p.headline, g.role, rec.score
         FROM recommendations rec
         JOIN gaps g ON g.id = rec.source_gap_id
         JOIN profiles p ON p.user_id = rec.target_user_id
         WHERE rec.status = 'ACTIVE'
           AND (rec.score_breakdown->>'roleFit')::float = 1.0
           AND lower(regexp_replace(coalesce(p.headline,''), '[^a-zA-Z0-9]', '', 'g'))
             != lower(regexp_replace(g.role, '[^a-zA-Z0-9]', '', 'g'))
         LIMIT 5`
      );
      return {
        pass: r.rows.length === 0,
        detail: r.rows.length === 0
          ? 'no stale role claims'
          : r.rows.map(x => `${x.display_name} is "${x.headline}" but a ${Math.round(x.score*100)}% row claims exact match for "${x.role}"`).join('; '),
      };
    },
  },

  {
    name: 'No explanation claims a skill overlap it cannot name',
    async check() {
      const r = await pool.query(
        `SELECT s.name AS startup, g.role, p.display_name
         FROM recommendations rec
         JOIN gaps g ON g.id = rec.source_gap_id
         JOIN startups s ON s.id = g.startup_id
         JOIN profiles p ON p.user_id = rec.target_user_id
         WHERE rec.status = 'ACTIVE'
           AND (rec.explanation::text LIKE '%skill overlap: .%'
             OR rec.explanation::text LIKE '%skill overlap: ,%'
             OR rec.explanation::text LIKE '%covers .%')
         LIMIT 5`
      );
      return {
        pass: r.rows.length === 0,
        detail: r.rows.length === 0
          ? 'no empty skill claims'
          : r.rows.map(x => `${x.display_name} -> ${x.startup}/${x.role}`).join('; '),
      };
    },
  },

  // --- INVESTOR SIDE ---
  {
    name: 'Investor deal flow respects the stated thesis domain',
    async check() {
      const r = await pool.query(
        `SELECT p.display_name AS investor, s.name AS startup, rec.score,
                ip.preferred_domains, s.domain
         FROM recommendations rec
         JOIN profiles p ON p.user_id = rec.target_user_id
         JOIN investor_profiles ip ON ip.profile_id = p.id
         JOIN startups s ON s.id = rec.startup_id
         WHERE rec.status = 'ACTIVE' AND rec.recommendation_type = 'INVESTOR'
           AND rec.score >= 0.50
           AND (rec.score_breakdown->>'domainFit')::float = 0
         ORDER BY rec.score DESC LIMIT 5`
      );
      return {
        pass: r.rows.length === 0,
        detail: r.rows.length === 0
          ? 'no investor sees a 50%+ match with zero domain fit'
          : r.rows.map(x => `${x.investor} -> ${x.startup} at ${Math.round(x.score*100)}% with 0 domain fit`).join('; '),
      };
    },
  },
  {
    name: 'Investors only see ventures above the readiness bar',
    async check() {
      const r = await pool.query(
        `SELECT s.name, ra.overall_score
         FROM recommendations rec
         JOIN startups s ON s.id = rec.startup_id
         LEFT JOIN LATERAL (
           SELECT overall_score FROM readiness_assessments
           WHERE startup_id = s.id ORDER BY generated_at DESC LIMIT 1
         ) ra ON true
         WHERE rec.status = 'ACTIVE' AND rec.recommendation_type = 'INVESTOR'
           AND (ra.overall_score IS NULL OR ra.overall_score < 35)
         LIMIT 5`
      );
      return {
        pass: r.rows.length === 0,
        detail: r.rows.length === 0
          ? 'all investor-visible ventures are above the bar'
          : r.rows.map(x => `${x.name} at ${x.overall_score ?? 'no readiness'}`).join('; '),
      };
    },
  },

  // --- DATA COMPLETENESS ---
  {
    name: 'Every real venture has a founder vision',
    async check() {
      const r = await pool.query(
        `SELECT s.name FROM startups s JOIN users u ON u.id = s.founder_id
         WHERE (s.founder_vision IS NULL OR trim(s.founder_vision) = '')
           AND u.email != 'system.import@capforge.internal'
           AND s.verification_status != 'UNVERIFIED'`
      );
      return {
        pass: r.rows.length === 0,
        detail: r.rows.length === 0 ? 'all have one' : r.rows.map(x => x.name).join(', '),
      };
    },
  },
  {
    name: 'Every seeded contributor has a mission',
    async check() {
      const r = await pool.query(
        `SELECT p.display_name FROM contributor_profiles cp
         JOIN profiles p ON p.id = cp.profile_id
         JOIN users u ON u.id = p.user_id
         WHERE u.email LIKE '%@seed.test'
           AND (cp.looking_for IS NULL OR trim(cp.looking_for) = '')`
      );
      return {
        pass: r.rows.length === 0,
        detail: r.rows.length === 0 ? 'all have one' : `${r.rows.length} missing`,
      };
    },
  },
];

(async () => {
  console.log('MATCHING QUALITY TESTS\n' + '='.repeat(70) + '\n');
  let passed = 0, failed = 0;

  for (const rule of RULES) {
    try {
      const r = await rule.check();
      console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${rule.name}`);
      console.log(`      ${r.detail}\n`);
      r.pass ? passed++ : failed++;
    } catch (err) {
      console.log(`ERROR ${rule.name}`);
      console.log(`      ${err.message}\n`);
      failed++;
    }
  }

  console.log('='.repeat(70));
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) console.log('\nThe engine does not meet the bar yet.');
  else console.log('\nAll quality rules hold.');

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
})();
