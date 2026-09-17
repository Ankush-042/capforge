require('dotenv').config();
/**
 * Does the matching engine actually work? Measured, not asserted.
 *
 * Until now the claim "matching is strong" rested on 17 quality rules, which
 * prove the engine never does anything obviously stupid, and on eyeballing
 * four profiles. Neither is a number. A defence panel asking "how do you know
 * it works" deserves better than "it looked right when I tried it".
 *
 * WHAT THIS MEASURES
 * Precision@1 and Precision@3 against hand-labelled ground truth, compared
 * against two baselines on exactly the same data.
 *
 * THE CIRCULARITY TRAP, AVOIDED DELIBERATELY
 * The obvious mistake is to define ground truth using the engine's own
 * ROLE_ADJACENCY table or its own domain equivalence groups. That grades the
 * engine against itself and would produce a meaningless 100%. Ground truth
 * here is written by hand below, in terms a person would agree with without
 * seeing any of the code: a backend engineer belongs in a backend role, a
 * designer does not. Nothing in the labels is derived from the engine.
 *
 * THE BASELINES
 * - RANDOM: shuffles the same candidate pool. The floor. Anything not beating
 *   this is worthless.
 * - NAIVE KEYWORD: literal token overlap between the candidate's skills and
 *   the gap's required skills, with no generic-word guard, no equivalence
 *   groups, no role adjacency. This is deliberately the engine as it existed
 *   before today's fixes, and it is the honest comparison, because it is what
 *   anyone would write first.
 *
 * Run: node scripts/evaluate-matching.js
 */
const pool = require('../backend/shared/db');
const { scoreCandidate } = require('../backend/matching/matchingService');

/**
 * GROUND TRUTH, hand-written.
 *
 * Each entry says: for a gap whose role matches `gapRole`, a candidate whose
 * headline matches any `shouldMatch` pattern is a correct top result, and one
 * matching any `shouldNotMatch` pattern is definitely wrong.
 *
 * These are uncontroversial. Nobody needs to see the scoring code to agree
 * that a UX researcher is the wrong answer for a backend engineering role.
 * Patterns are lowercase substrings checked against the candidate headline.
 */
const GROUND_TRUTH = [
  {
    gapRole: /backend|full stack|devops|site reliability|cloud infrastructure/i,
    shouldMatch: ['backend', 'full stack', 'devops', 'site reliability', 'cloud infrastructure', 'software engineer', 'platform engineer'],
    shouldNotMatch: ['designer', 'ux', 'ui', 'researcher', 'content', 'community manager', 'growth marketer', 'sales'],
    label: 'engineering role',
  },
  {
    gapRole: /ux|ui|designer|design research/i,
    shouldMatch: ['designer', 'ux', 'ui', 'design research', 'ux writer', 'product designer'],
    shouldNotMatch: ['backend', 'devops', 'security engineer', 'data engineer', 'compliance', 'embedded'],
    label: 'design role',
  },
  {
    gapRole: /machine learning|ai\/ml|data scientist|nlp/i,
    shouldMatch: ['machine learning', 'ml engineer', 'data scientist', 'ai/ml', 'nlp'],
    shouldNotMatch: ['designer', 'ux', 'community manager', 'content strategist', 'sales engineer', 'hardware'],
    label: 'ML role',
  },
  {
    gapRole: /compliance|legal|privacy/i,
    shouldMatch: ['compliance', 'legal', 'privacy', 'regulatory'],
    shouldNotMatch: ['backend', 'frontend', 'designer', 'hardware', 'growth marketer', 'community'],
    label: 'compliance role',
  },
  {
    gapRole: /growth|marketer|marketing|community/i,
    shouldMatch: ['growth', 'marketer', 'marketing', 'community', 'content strategist'],
    shouldNotMatch: ['backend', 'devops', 'embedded', 'biomedical', 'compliance specialist', 'data engineer'],
    label: 'growth role',
  },
  {
    gapRole: /hardware|embedded|electrical/i,
    shouldMatch: ['hardware', 'embedded', 'electrical'],
    shouldNotMatch: ['designer', 'growth', 'content', 'compliance', 'community', 'ux'],
    label: 'hardware role',
  },
];

function truthFor(gapRole) {
  return GROUND_TRUTH.find((t) => t.gapRole.test(gapRole)) || null;
}

/** Correct / wrong / unlabelled, from hand-written truth only. */
function judge(truth, headline) {
  const h = (headline || '').toLowerCase();
  if (truth.shouldMatch.some((p) => h.includes(p))) return 'correct';
  if (truth.shouldNotMatch.some((p) => h.includes(p))) return 'wrong';
  return 'unlabelled';
}

/**
 * The naive baseline: literal token overlap, no guards of any kind.
 * This is what the engine did before the generic-token fix, and it is what
 * anyone writing this from scratch would write first.
 */
function naiveScore(gap, candidate) {
  const req = (gap.required_skills || []).map((s) => String(s).toLowerCase());
  const have = (candidate.skills || []).map((s) => String(s).toLowerCase());
  let hits = 0;
  for (const r of req) {
    const rt = r.split(/[\s/,-]+/);
    for (const h of have) {
      const ht = h.split(/[\s/,-]+/);
      if (rt.some((t) => ht.includes(t))) { hits++; break; }
    }
  }
  return req.length > 0 ? hits / req.length : 0;
}

function precisionAtK(rankedHeadlines, truth, k) {
  const top = rankedHeadlines.slice(0, k);
  const judged = top.map((h) => judge(truth, h)).filter((v) => v !== 'unlabelled');
  if (judged.length === 0) return null; // nothing labelled: excluded, not counted as a win
  return judged.filter((v) => v === 'correct').length / judged.length;
}

function mean(xs) {
  const v = xs.filter((x) => x !== null);
  return v.length === 0 ? null : v.reduce((a, b) => a + b, 0) / v.length;
}

(async () => {
  const gaps = (await pool.query(
    `SELECT g.*, s.id AS s_id, s.name AS s_name, s.domain AS s_domain, s.stage AS s_stage, s.founder_id AS s_founder_id
     FROM gaps g
     JOIN startups s ON s.id = g.startup_id
     JOIN users u ON u.id = s.founder_id
     WHERE g.status NOT IN ('FILLED','DISMISSED')
       AND u.email != 'system.import@capforge.internal'
       AND s.verification_status != 'UNVERIFIED'`
  )).rows;

  const candidates = (await pool.query(
    `SELECT u.id AS user_id, p.headline, p.skills, cp.availability, cp.preferred_domains,
            cp.preferred_stage, cp.experience_years, cp.equity_preference
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     JOIN contributor_profiles cp ON cp.profile_id = p.id
     WHERE u.primary_role = 'CONTRIBUTOR' AND p.visibility = 'DISCOVERABLE'
       AND p.headline IS NOT NULL`
  )).rows;

  console.log('MATCHING ENGINE EVALUATION');
  console.log('='.repeat(70));
  console.log(`Gaps available: ${gaps.length}   Candidates in pool: ${candidates.length}\n`);

  const scored = { engine: { p1: [], p3: [] }, naive: { p1: [], p3: [] }, random: { p1: [], p3: [] } };
  let evaluated = 0;
  const failures = [];

  for (const g of gaps) {
    const truth = truthFor(g.role);
    if (!truth) continue; // no hand-written label for this role family: skipped, never guessed
    evaluated++;

    const startup = { id: g.s_id, name: g.s_name, domain: g.s_domain, stage: g.s_stage, founder_id: g.s_founder_id };

    // THE REAL ENGINE, called exactly as the app calls it.
    const engineRanked = candidates
      .map((c) => ({ h: c.headline, s: scoreCandidate(g, startup, c, 0).score }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.h);

    const naiveRanked = candidates
      .map((c) => ({ h: c.headline, s: naiveScore(g, c) }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.h);

    const randomRanked = [...candidates].sort(() => Math.random() - 0.5).map((c) => c.headline);

    for (const [name, ranked] of [['engine', engineRanked], ['naive', naiveRanked], ['random', randomRanked]]) {
      scored[name].p1.push(precisionAtK(ranked, truth, 1));
      scored[name].p3.push(precisionAtK(ranked, truth, 3));
    }

    // Record where the engine put something hand-labelled as wrong at rank 1.
    if (judge(truth, engineRanked[0]) === 'wrong') {
      failures.push(`${g.s_name} / ${g.role} (${truth.label}) → top result "${engineRanked[0]}"`);
    }
  }

  if (evaluated === 0) {
    console.log('No gaps matched any hand-written label. Nothing to measure.');
    await pool.end();
    process.exit(1);
  }

  const pct = (v) => (v === null ? '  n/a' : `${(v * 100).toFixed(1)}%`);
  const rows = [
    ['CapForge engine', mean(scored.engine.p1), mean(scored.engine.p3)],
    ['Naive keyword overlap', mean(scored.naive.p1), mean(scored.naive.p3)],
    ['Random ordering', mean(scored.random.p1), mean(scored.random.p3)],
  ];

  console.log(`Gaps evaluated against hand-written ground truth: ${evaluated} of ${gaps.length}`);
  console.log('(the rest have no label, and are skipped rather than guessed at)\n');
  console.log('                            Precision@1   Precision@3');
  console.log('-'.repeat(70));
  for (const [name, p1, p3] of rows) {
    console.log(`  ${name.padEnd(26)} ${pct(p1).padStart(8)}      ${pct(p3).padStart(8)}`);
  }

  const engineP1 = mean(scored.engine.p1);
  const naiveP1 = mean(scored.naive.p1);
  console.log('\n' + '='.repeat(70));
  if (engineP1 !== null && naiveP1 !== null) {
    const lift = ((engineP1 - naiveP1) * 100).toFixed(1);
    console.log(`Engine beats the naive baseline by ${lift} points of precision@1.`);
  }

  if (failures.length > 0) {
    console.log(`\n${failures.length} case(s) where the top result is hand-labelled WRONG:`);
    for (const f of failures.slice(0, 8)) console.log(`  ${f}`);
    console.log('\nThese are the real failures. Precision above 0 does not excuse them.');
  } else {
    console.log('\nNo case where the top result is hand-labelled wrong.');
  }

  await pool.end();
  process.exit(0);
})();
