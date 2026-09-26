/**
 * Every venture in a contributor's fields, ranked by how well it suits them.
 *
 * THE BUG THIS EXISTS TO FIX, and it was structural rather than a mistake in
 * any one line. Contributor opportunities read the `recommendations` table,
 * which is keyed by ROLE: every row is (startup, contributor, gap). A venture
 * whose open roles do not match you produces no row, so it does not exist as
 * far as you are concerned.
 *
 * The effect: a full-stack builder selects healthtech, and NeuraHealth does
 * not appear at all, because its open roles are Clinical Advisor, Mobile App
 * Developer and UX/UI Designer. The engine was right that none of those fit.
 * It was wrong to conclude the venture should be invisible.
 *
 * THAT IS THE SAME MISTAKE AS THE INVESTOR READINESS BAR: hiding instead of
 * ranking. A person choosing where to spend years wants to see who is
 * building in their field. Whether one particular role is open today is
 * information ABOUT a venture, not a reason to erase it. In real life you
 * write to a venture you care about and say "nothing listed fits me, here is
 * what I would do instead".
 *
 * So this starts from VENTURES, not roles. Every venture in your fields comes
 * back. The best-fitting open role is attached when there is one, and when
 * there is not, the venture says so plainly and you can still write to them.
 *
 * Nothing here replaces the role-level engine. That still ranks candidates
 * for a founder, which is a different question and works.
 */
const pool = require('../shared/db');
const { computeRoleFitForTesting: computeRoleFit, domainsMatch } = require('./matchingService');

/**
 * WEIGHTS. Domain is weighted equally with wanting the work and being able to
 * do it, because a contributor who picks a field has told us the single most
 * concrete thing about themselves, and the previous design let that count for
 * almost nothing next to whether a role happened to be open.
 *
 * These are our judgement, labelled as such wherever the score is explained,
 * and they only order a list. Nothing is hidden on the strength of them.
 */
const WEIGHTS = {
  domain: 0.30,     // the field they actually chose
  alignment: 0.30,  // what they said they want to work on, against the founder's vision
  role: 0.30,       // whether they can do something this venture needs
  stage: 0.10,      // how early they said they want to join
};

const round2 = (n) => Math.round(n * 100) / 100;

/** The best open role for this person, and what to say when there is not one. */
function bestRoleFor(gaps, profile) {
  const open = gaps.filter((g) => !['FILLED', 'DISMISSED'].includes(g.status));
  if (gaps.length === 0) return { state: 'NO_ROLES_DIAGNOSED', fit: 0, role: null, openCount: 0 };
  if (open.length === 0) return { state: 'ALL_FILLED', fit: 0, role: null, openCount: 0 };

  const skills = (profile.skills || []).map((s) => String(s).toLowerCase().trim());
  let best = { fit: 0, role: null, overlap: [] };

  for (const g of open) {
    const roleFit = computeRoleFit(profile.headline, g.role);
    const need = (g.required_skills || []).map((s) => String(s).toLowerCase().trim());
    const overlap = need.filter((n) => skills.some((s) => s === n || (n.length > 3 && s.includes(n)) || (s.length > 3 && n.includes(s))));
    const skillFit = need.length === 0 ? 0 : overlap.length / need.length;
    // Role name carries more than token overlap, because required skills are
    // often written as prose nobody lists on a profile.
    const fit = roleFit * 0.65 + skillFit * 0.35;
    if (fit > best.fit) best = { fit, role: g.role, overlap };
  }

  // A real fit, rather than the least bad of several poor options.
  if (best.fit >= 0.35) {
    return { state: 'ROLE_FITS', fit: best.fit, role: best.role, overlap: best.overlap, openCount: open.length };
  }
  return {
    state: 'NO_ROLE_FITS',
    fit: best.fit,
    role: null,
    closest: best.role || open[0].role,
    openCount: open.length,
  };
}

async function rankVenturesForContributor(userId) {
  const me = (await pool.query(
    `SELECT p.headline, p.skills, cp.preferred_domains, cp.preferred_stage, cp.looking_for
     FROM profiles p
     LEFT JOIN contributor_profiles cp ON cp.profile_id = p.id
     WHERE p.user_id = $1`,
    [userId]
  )).rows[0];
  if (!me) return { success: false, error: 'NO_PROFILE' };

  const myDomains = (me.preferred_domains || []).map((d) => String(d).toLowerCase());
  const myStages = (me.preferred_stage || []).map((s) => String(s).toLowerCase());

  const ventures = (await pool.query(
    `SELECT s.id, s.name, s.domain, s.stage, s.problem, s.founder_vision, s.founder_id,
            p.display_name AS founder_name, p.profile_image AS founder_avatar,
            (SELECT overall_score FROM readiness_assessments ra
             WHERE ra.startup_id = s.id ORDER BY ra.generated_at DESC LIMIT 1) AS readiness,
            (SELECT COUNT(*)::int FROM startup_team_members tm WHERE tm.startup_id = s.id) AS team_size
     FROM startups s
     JOIN profiles p ON p.user_id = s.founder_id
     JOIN users u ON u.id = s.founder_id
     WHERE u.email != 'system.import@capforge.internal'
       AND s.verification_status != 'UNVERIFIED'
       AND s.founder_id != $1
       AND NOT EXISTS (SELECT 1 FROM startup_team_members tm
                       WHERE tm.startup_id = s.id AND tm.user_id = $1)`,
    [userId]
  )).rows;

  const [allGaps, alignments] = await Promise.all([
    pool.query(`SELECT startup_id, role, status, required_skills FROM gaps`),
    pool.query(`SELECT startup_id, score, reason FROM alignment_scores WHERE user_id = $1`, [userId]),
  ]);

  const gapsByStartup = {};
  for (const g of allGaps.rows) (gapsByStartup[g.startup_id] ||= []).push(g);
  const alignByStartup = {};
  for (const a of alignments.rows) alignByStartup[a.startup_id] = { score: parseFloat(a.score), reason: a.reason };

  const scored = ventures.map((v) => {
    const vDomains = (v.domain || []).map((d) => String(d).toLowerCase());
    const matchedDomain = myDomains.find((d) => vDomains.some((vd) => domainsMatch(d, vd)));
    const domainFit = matchedDomain ? 1 : 0;

    const align = alignByStartup[v.id] || null;
    const role = bestRoleFor(gapsByStartup[v.id] || [], me);

    const stageFit = myStages.length === 0 ? 0.5
      : myStages.some((s) => String(v.stage || '').toLowerCase().includes(s)) ? 1 : 0.2;

    // Alignment is often absent for a brand-new contributor. Its weight is
    // redistributed rather than counted as zero, which would punish somebody
    // simply for being new.
    const parts = [
      ['domain', domainFit, WEIGHTS.domain],
      ['role', role.fit, WEIGHTS.role],
      ['stage', stageFit, WEIGHTS.stage],
    ];
    if (align) parts.push(['alignment', align.score, WEIGHTS.alignment]);
    const totalWeight = parts.reduce((a, [, , w]) => a + w, 0);
    const score = parts.reduce((a, [, val, w]) => a + val * (w / totalWeight), 0);

    return {
      startupId: v.id,
      name: v.name,
      domain: v.domain,
      stage: v.stage,
      problem: v.problem,
      founderId: v.founder_id,
      founderName: v.founder_name,
      founderAvatar: v.founder_avatar,
      readiness: v.readiness !== null ? Math.round(parseFloat(v.readiness)) : null,
      teamSize: v.team_size,
      inYourFields: Boolean(matchedDomain),
      matchedDomain: matchedDomain || null,
      fit: Math.round(score * 100),
      roleState: role.state,
      bestRole: role.role,
      bestRoleFit: role.role ? Math.round(role.fit * 100) : null,
      closestRole: role.closest || null,
      openRoles: role.openCount,
      alignmentReason: align ? align.reason : null,
      alignmentScore: align ? round2(align.score) : null,
    };
  });

  // Everything in their fields, always, ordered by fit. Then anything outside
  // their fields that still fits well, so a good match is not lost because
  // somebody forgot to tick a box.
  const inFields = scored.filter((v) => v.inYourFields).sort((a, b) => b.fit - a.fit);
  const outside = scored.filter((v) => !v.inYourFields && v.fit >= 40).sort((a, b) => b.fit - a.fit).slice(0, 6);

  return {
    success: true,
    inFields,
    outside,
    // Said plainly so a short list reads as a fact about the platform rather
    // than as the product being broken.
    context: {
      fieldsChosen: myDomains,
      venturesInYourFields: inFields.length,
      totalVentures: scored.length,
      withARoleForYou: inFields.filter((v) => v.roleState === 'ROLE_FITS').length,
      hasMission: Boolean(me.looking_for),
    },
  };
}

module.exports = { rankVenturesForContributor, WEIGHTS };
