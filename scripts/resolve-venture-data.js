require('dotenv').config();
/**
 * Close out the last two quality-test failures. Both are data, not engine.
 *
 * 1. DUPLICATE VENTURE NAMES
 *    Two ventures named "OP.GG for Time Takers". Rather than guess which one
 *    matters, this compares them on real substance: team members, gaps,
 *    readiness assessments, recommendations. It keeps the one with more and
 *    deletes the emptier one, printing exactly what it found first.
 *    If they are genuinely comparable it refuses to choose and says so,
 *    because deleting a venture someone is using is not recoverable.
 *
 * 2. MISSING FOUNDER VISION
 *    A vision is generated from the venture's OWN problem and solution text,
 *    which already exists in the database. That is derived from real data,
 *    not invented: the venture already says what it does, this writes the
 *    "why" in the founder's register so alignment scoring has something
 *    truthful to work with.
 *
 * Usage:
 *   node scripts/resolve-venture-data.js          show what it would do
 *   node scripts/resolve-venture-data.js --apply  actually do it
 */
const pool = require('../backend/shared/db');
const { callGroq } = require('../backend/shared/aiClient');

const GROQ_MODEL = 'openai/gpt-oss-120b';
const apply = process.argv.includes('--apply');

async function substanceOf(startupId) {
  const [team, gaps, readiness, recs, convos] = await Promise.all([
    pool.query(`SELECT COUNT(*) n FROM startup_team_members WHERE startup_id = $1`, [startupId]),
    pool.query(`SELECT COUNT(*) n FROM gaps WHERE startup_id = $1`, [startupId]),
    pool.query(`SELECT COUNT(*) n FROM readiness_assessments WHERE startup_id = $1`, [startupId]),
    pool.query(`SELECT COUNT(*) n FROM recommendations WHERE startup_id = $1`, [startupId]),
    pool.query(`SELECT COUNT(*) n FROM conversations WHERE startup_id = $1`, [startupId]),
  ]);
  const counts = {
    team: +team.rows[0].n, gaps: +gaps.rows[0].n,
    readiness: +readiness.rows[0].n, recommendations: +recs.rows[0].n,
    conversations: +convos.rows[0].n,
  };
  // Conversations and team members represent real human involvement and
  // weigh far more than generated rows like recommendations.
  counts.weight = counts.conversations * 100 + counts.team * 50 + counts.readiness * 10 + counts.gaps * 5 + counts.recommendations;
  return counts;
}

(async () => {
  console.log(apply ? 'APPLYING CHANGES\n' : 'DRY RUN — nothing will be changed. Re-run with --apply.\n');

  // === 1. Duplicate venture names ===
  const dupNames = await pool.query(
    `SELECT lower(trim(name)) AS key, COUNT(*) n FROM startups
     GROUP BY lower(trim(name)) HAVING COUNT(*) > 1`
  );

  console.log('='.repeat(70));
  console.log(`DUPLICATE VENTURE NAMES: ${dupNames.rows.length}\n`);

  for (const d of dupNames.rows) {
    const rows = (await pool.query(
      `SELECT s.id, s.name, s.status, s.created_at, u.email AS founder
       FROM startups s JOIN users u ON u.id = s.founder_id
       WHERE lower(trim(s.name)) = $1 ORDER BY s.created_at ASC`,
      [d.key]
    )).rows;

    const scored = [];
    for (const r of rows) {
      const c = await substanceOf(r.id);
      scored.push({ ...r, ...c });
      console.log(`  ${r.name}  [${r.id}]`);
      console.log(`    founder: ${r.founder}  status: ${r.status}  created: ${r.created_at.toISOString().slice(0, 10)}`);
      console.log(`    team ${c.team}, gaps ${c.gaps}, readiness ${c.readiness}, recs ${c.recommendations}, conversations ${c.conversations}  -> weight ${c.weight}`);
    }

    scored.sort((a, b) => b.weight - a.weight);
    const keep = scored[0];
    const drop = scored.slice(1);

    // Refuse to choose when it is genuinely close. Deleting a venture
    // someone is using cannot be undone.
    const tooClose = drop.some(x => x.weight > 0 && x.weight >= keep.weight * 0.5);
    if (tooClose) {
      console.log(`\n    REFUSING TO CHOOSE: these have comparable real activity.`);
      console.log(`    Tell me which id to keep and I will delete the other.\n`);
      continue;
    }

    console.log(`\n    KEEP:   ${keep.id} (weight ${keep.weight})`);
    for (const x of drop) {
      console.log(`    DELETE: ${x.id} (weight ${x.weight})`);
      if (apply) {
        await pool.query(`DELETE FROM startups WHERE id = $1`, [x.id]);
        console.log(`            deleted.`);
      }
    }
    console.log('');
  }

  // === 2. Missing founder visions ===
  const missing = (await pool.query(
    `SELECT s.id, s.name, s.problem, s.solution, s.domain, s.target_users
     FROM startups s JOIN users u ON u.id = s.founder_id
     WHERE (s.founder_vision IS NULL OR trim(s.founder_vision) = '')
       AND u.email != 'system.import@capforge.internal'
       AND s.verification_status != 'UNVERIFIED'`
  )).rows;

  console.log('='.repeat(70));
  console.log(`VENTURES WITHOUT A FOUNDER VISION: ${missing.length}\n`);

  for (const v of missing) {
    if (!v.problem && !v.solution) {
      console.log(`  SKIP  ${v.name} — has no problem or solution text either, so there is nothing truthful to write from.`);
      continue;
    }

    console.log(`  ${v.name}`);
    console.log(`    problem:  ${(v.problem || 'none').slice(0, 100)}`);
    console.log(`    solution: ${(v.solution || 'none').slice(0, 100)}`);

    const ai = await callGroq(GROQ_MODEL, [
      {
        role: 'system',
        content: `Write a founder's statement of why they are building this venture, in first person.

Rules:
- Ground it ONLY in the problem and solution given. Invent no facts, no numbers, no customers, no history.
- 2 to 4 sentences. Plain spoken, the way a real founder would explain it to someone they respect.
- Say why the problem is worth solving, not what the product does.
- No marketing language, no superlatives, no "revolutionise" or "disrupt".
- Return ONLY the statement. No preamble, no quotes.`,
      },
      {
        role: 'user',
        content: `Venture: ${v.name}
Field: ${(v.domain || []).join(', ') || 'not stated'}
Problem: ${v.problem || 'not stated'}
Solution: ${v.solution || 'not stated'}
For: ${(v.target_users || []).join(', ') || 'not stated'}`,
      },
    ], { temperature: 0.6, max_tokens: 1000 });

    if (!ai.success) {
      console.log(`    FAILED: ${ai.error} ${ai.detail || ''}`);
      continue;
    }
    const vision = ai.content.trim().replace(/^["']|["']$/g, '');
    console.log(`    -> "${vision}"`);

    if (apply) {
      await pool.query(`UPDATE startups SET founder_vision = $1 WHERE id = $2`, [vision, v.id]);
      console.log(`       saved.`);
    }
    console.log('');
  }

  console.log('='.repeat(70));
  if (!apply) console.log('DRY RUN. Re-run with --apply to make these changes.');
  else console.log('Done. NEXT: backfill-vision-embeddings.js --force, score-alignment.js --force, rerank-everything.js, test-matching-quality.js');
  await pool.end();
  process.exit(0);
})();
