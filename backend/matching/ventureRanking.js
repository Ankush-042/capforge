/**
 * Ventures ranked for a contributor.
 *
 * WHAT WAS WRONG, AND IT WAS WRONG AT THE ROOT. The engine matched ROLES. Every
 * contributor-facing surface read the recommendations table, which holds one
 * row per (person, open role), so a venture only existed to you if it had an
 * open role you happened to fit. Domain was a scoring nudge inside that.
 *
 * The consequence in real use: a full-stack builder selects healthtech and
 * sees ONE result, because NeuraHealth's three open roles are Clinical
 * Advisor, Mobile App Developer and UX/UI Designer. The engine was right that
 * none of those is a full-stack job. It was wrong to conclude that the
 * venture should therefore not exist. A person who cares about healthtech
 * wants to see the healthtech ventures and decide for themselves; in real
 * life you write to a founder and say "nothing listed fits me, but here is
 * what I would do".
 *
 * This is the same mistake as the investor readiness bar, in a different
 * place: hiding where it should be ranking. Absence carries no information.
 * Order does.
 *
 * SO THE UNIT IS THE VENTURE. Every venture in the fields you chose comes
 * back, ranked by how well it suits you, and each one states its real role
 * situation rather than being silently dropped for it.
 */
const pool = require('../shared/db');
const { domainsMatch, computeRoleFitForTesting: computeRoleFit } = require('./matchingService');

/**
 * WEIGHTS. Domain leads because a contributor choosing a field is making the
 * strongest statement they can about where they want to spend years, and the
 * old engine treated that as a tiebreaker.
 *
 * These are our judgement, not measured, and are exposed so the page can say
 * so rather than presenting a number as fact.
 */
const WEIGHTS = {
  domain: 0.35,      // they chose this field
  alignment: 0.30,   // what they said they want, against what the venture is
  capability: 0.25,  // can they actually do anything here
  stage: 0.10,       // how early they want to join
};

const STAGE_ORDER = ['Idea', 'Prototype', 'MVP', 'Early Traction'];

function stageFit(preferred, actual) {
  if (!preferred || !actual) return 0.5;
  const p = STAGE_ORDER.indexOf(preferred);
  const a = STAGE_ORDER.indexOf(actual);
  if (p === -1 || a === -1) return 0.5;
  const gap = Math.abs(p - a);
  return gap === 0 ? 1 : gap === 1 ? 0.7 : gap === 2 ? 0.4 : 0.2;
}

/** How well does any single open role here suit them, and which one is best. */
function bestRole(headline, skills, gaps) {
  if (!gaps || gaps.length === 0) return { fit: 0, role: null, state: 'NO_OPEN_ROLES' };

  const mine = new Set((skills || []).map((s) => String(s).toLowerCase().trim()));
  let best = { fit: 0, role: null, state: 'NO_ROLE_FITS' };

  for (const g of gaps) {
    const roleFit = computeRoleFit(headline || '', g.role || '');
    const need = (g.required_skills || []).map((s) => String(s).toLowerCase().trim());
    const overlap = need.length === 0 ? 0 : need.filter((s) => mine.has(s)).length / need.length;
    // A role match matters more than skill overlap: somebody who IS a backend
    // engineer fits a backend role even if the listed skills differ.
    const fit = roleFit * 0.65 + overlap * 0.35;
    if (fit > best.fit) {
      best = { fit, role: g.role, gapId: g.id, state: 'ROLE_FITS', overlap, roleFit };
    }
  }
  // Below this, calling it a fit would be a lie, so it is reported as a near
  // miss with the closest role named rather than as a match.
  if (best.fit < 0.3) {
    return { fit: best.fit, role: null, closest: best.role, state: 'NO_ROLE_FITS' };
  }
  return best;
}

async function rankVenturesForContributor(userId, { field = null } = {}) {
  const me = (await pool.query(
    `SELECT p.user_id, p.headline, p.skills, p.display_name,
            cp.preferred_domains, cp.preferred_stage, cp.mission
     FROM profiles p
     LEFT JOIN contributor_profiles cp ON cp.profile_id = p.id
     WHERE p.user_id = $1`,
    [userId]
  )).rows[0];
  if (!me) return { success: false, error: 'NO_PROFILE' };

  const myDomains = (me.preferred_domains || []).map((d) => String(d).toLowerCase().trim());

  // Every real venture. Not every venture WITH A MATCHING GAP, which is the
  // whole point of this rewrite.
  const ventures = (await pool.query(
    `SELECT s.id, s.name, s.problem, s.solution, s.domain, s.stage, s.founder_id,
            p.display_name AS founder_name, p.profile_image AS founder_avatar,
            (SELECT overall_score FROM readiness_assessments ra
             WHERE ra.startup_id = s.id ORDER BY ra.generated_at DESC LIMIT 1) AS readiness,
            (SELECT COUNT(*)::int FROM startup_team_members tm WHERE tm.startup_id = s.id) AS team_size,
            a.score AS alignment_score, a.reason AS alignment_reason
     FROM startups s
     JOIN profiles p ON p.user_id = s.founder_id
     LEFT JOIN alignment_scores a ON a.startup_id = s.id AND a.user_id = $1
     WHERE s.verification_status != 'UNVERIFIED'
       AND s.founder_id != $1
     ORDER BY s.name`,
    [userId]
  )).rows;

  // Open roles per venture, fetched once rather than per venture.
  const gapRows = (await pool.query(
    `SELECT id, startup_id, role, required_skills, priority_level, priority_score, seeking_type
     FROM gaps WHERE status NOT IN ('FILLED', 'DISMISSED')`
  )).rows;
  const gapsBy = {};
  for (const g of gapRows) (gapsBy[g.startup_id] ||= []).push(g);

  const scored = ventures.map((v) => {
    const vDomains = (v.domain || []).map((d) => String(d).toLowerCase().trim());
    const matchedField = vDomains.find((vd) => myDomains.some((md) => domainsMatch(md, vd))) || null;
    const domainFit = matchedField ? 1 : 0;

    const alignment = v.alignment_score !== null && v.alignment_score !== undefined
      ? parseFloat(v.alignment_score) : null;

    const role = bestRole(me.headline, me.skills, gapsBy[v.id]);
    const sFit = stageFit(me.preferred_stage, v.stage);

    // Alignment is only counted when it exists. Treating an unscored venture
    // as 0 would push it below everything for a reason that is our gap, not
    // theirs, so the weight is redistributed instead.
    const parts = [
      { k: 'domain', w: WEIGHTS.domain, v: domainFit },
      { k: 'capability', w: WEIGHTS.capability, v: role.fit },
      { k: 'stage', w: WEIGHTS.stage, v: sFit },
    ];
    if (alignment !== null) parts.push({ k: 'alignment', w: WEIGHTS.alignment, v: alignment });
    const totalW = parts.reduce((a, p) => a + p.w, 0);
    const score = parts.reduce((a, p) => a + p.v * (p.w / totalW), 0);

    return {
      id: v.id,
      name: v.name,
      problem: v.problem,
      domain: v.domain,
      stage: v.stage,
      // Needed to open a conversation. Without it the "write to the founder"
      // button on every card calls startConversation(undefined).
      founderId: v.founder_id,
      founderName: v.founder_name,
      founderAvatar: v.founder_avatar,
      readiness: v.readiness !== null ? Math.round(parseFloat(v.readiness)) : null,
      teamSize: v.team_size,
      score: Math.round(score * 100),
      inYourFields: Boolean(matchedField),
      matchedField,
      alignment: alignment !== null ? Math.round(alignment * 100) : null,
      alignmentReason: v.alignment_reason || null,
      openRoles: (gapsBy[v.id] || []).length,
      // The real situation, stated rather than used as a reason to disappear.
      role: {
        state: role.state,
        best: role.role || null,
        closest: role.closest || null,
        fit: Math.round((role.fit || 0) * 100),
        gapId: role.gapId || null,
      },
    };
  });

  const inFields = scored.filter((v) => v.inYourFields).sort((a, b) => b.score - a.score);
  const elsewhere = scored.filter((v) => !v.inYourFields).sort((a, b) => b.score - a.score);

  // Honest arithmetic for the page to state, so a thin result reads as "there
  // are only two ventures here" rather than "this is broken".
  const openInFields = inFields.reduce((a, v) => a + v.openRoles, 0);
  const fittingInFields = inFields.filter((v) => v.role.state === 'ROLE_FITS').length;

  return {
    success: true,
    you: { headline: me.headline, fields: me.preferred_domains || [], hasMission: Boolean(me.mission) },
    inYourFields: inFields,
    elsewhere,
    facts: {
      venturesInYourFields: inFields.length,
      openRolesInYourFields: openInFields,
      venturesWithARoleForYou: fittingInFields,
      venturesTotal: scored.length,
    },
    weights: WEIGHTS,
  };
}

module.exports = { rankVenturesForContributor, bestRole, stageFit, WEIGHTS };
