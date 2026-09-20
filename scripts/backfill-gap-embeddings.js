require('dotenv').config();
/**
 * Give every open role an embedding.
 *
 * Confirmed from a real diagnostic run: all 62 open gaps had NO embedding, so
 * semantic similarity was null for every candidate against every role,
 * platform-wide. The evidence filter accepts either literal skill overlap or
 * semantic similarity of at least 0.5, which meant in practice it accepted
 * only literal token overlap. Someone who listed one skill was invisible
 * almost everywhere regardless of how well they actually fit.
 *
 * gapDiagnosisService does generate these, in the background, after inserting
 * the gaps. Whether these predate that code or the generation failed quietly,
 * the result is the same and the data needs filling in.
 *
 * Usage:
 *   node scripts/backfill-gap-embeddings.js          fill in what is missing
 *   node scripts/backfill-gap-embeddings.js --force  regenerate everything
 */
const pool = require('../backend/shared/db');
const { generateEmbedding } = require('../backend/shared/embeddings');

(async () => {
  const force = process.argv.includes('--force');

  const gaps = (await pool.query(
    `SELECT g.id, g.role, g.required_skills, g.reason, s.name AS startup_name,
            g.embedding IS NOT NULL AS has_embedding
     FROM gaps g
     JOIN startups s ON s.id = g.startup_id
     WHERE g.status NOT IN ('FILLED','DISMISSED')
       ${force ? '' : 'AND g.embedding IS NULL'}
     ORDER BY s.name, g.role`
  )).rows;

  if (gaps.length === 0) {
    console.log('Every open role already has an embedding. Nothing to do.');
    await pool.end();
    process.exit(0);
  }

  console.log(`${gaps.length} role(s) to embed.\n`);

  let done = 0, failed = 0;
  for (const g of gaps) {
    // Same text the live path builds, so a backfilled embedding and a freshly
    // generated one are identical rather than subtly different.
    const text = `${g.role} ${(g.required_skills || []).join(' ')} ${g.reason || ''}`;
    try {
      const embedding = await generateEmbedding(text);
      if (!embedding) {
        console.log(`  FAIL  ${g.startup_name} / ${g.role} — generator returned nothing`);
        failed++;
        continue;
      }
      await pool.query('UPDATE gaps SET embedding = $1 WHERE id = $2', [JSON.stringify(embedding), g.id]);
      console.log(`  ok    ${g.startup_name} / ${g.role}`);
      done++;
    } catch (err) {
      console.log(`  FAIL  ${g.startup_name} / ${g.role} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Embedded: ${done}   Failed: ${failed}`);
  if (failed > 0) {
    console.log('\nIf everything failed, check that SKIP_EMBEDDINGS is not set and that');
    console.log('the local embedding model is available. The generator returning nothing');
    console.log('is silent by design, which is how this went unnoticed in the first place.');
  }
  if (done > 0) {
    console.log('\nNEXT: node scripts/rerank-everything.js');
    console.log('Embeddings alone change nothing until the rankings are recomputed.');
  }
  await pool.end();
  process.exit(0);
})().catch((err) => { console.error('Failed:', err.message); process.exit(1); });
