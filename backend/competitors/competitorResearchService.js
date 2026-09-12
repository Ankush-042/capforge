/**
 * Who is actually doing this.
 *
 * The existing competitor analysis reads the founder's own description and
 * infers a plausible category and plausible differentiation. It never looks
 * up a single real company. The page is honest about that, which is better
 * than pretending, but "here is a category you probably sit in" is a long way
 * from "here is who is actually doing this, and here is what they are not
 * doing".
 *
 * This is Signal's pattern applied to competitors: real search, real named
 * companies, every claim traceable to a source. The model's job is to READ
 * the results and identify which companies are genuinely comparable, not to
 * recall companies from training data. A name it produces that is not in the
 * search results is a hallucination, and the prompt says so explicitly.
 */
const pool = require('../shared/db');
const { callGroq } = require('../shared/aiClient');
const { tavilySearch } = require('../signal/signalService');

const GROQ_MODEL = 'openai/gpt-oss-120b';
const RESEARCH_CACHE_HOURS = 168; // a week: the competitive landscape does not move daily

/**
 * Build a search that finds COMPANIES rather than commentary.
 *
 * Searching the problem statement verbatim returns articles about the
 * problem. Searching for alternatives and tools returns the companies
 * solving it, which is what a founder needs.
 */
function buildQueries(startup) {
  const domain = (startup.domain || [])[0] || '';
  const problem = (startup.problem || '').slice(0, 140);
  return [
    `${domain} startups companies solving ${problem}`.trim(),
    `best ${domain} software alternatives tools`.trim(),
  ].filter((q) => q.length > 12);
}

async function researchCompetitors(startupId, { force = false } = {}) {
  const startupRes = await pool.query(`SELECT * FROM startups WHERE id = $1`, [startupId]);
  if (startupRes.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const startup = startupRes.rows[0];

  if (!startup.problem && !startup.solution) {
    return { success: false, error: 'NOTHING_TO_RESEARCH' };
  }

  if (!force) {
    const cached = await pool.query(
      `SELECT * FROM competitors
       WHERE startup_id = $1 AND researched_competitors IS NOT NULL
         AND researched_at > now() - interval '${RESEARCH_CACHE_HOURS} hours'
       ORDER BY researched_at DESC LIMIT 1`,
      [startupId]
    );
    if (cached.rows.length > 0) return { success: true, research: cached.rows[0], cached: true };
  }

  // General web results with no time window. A company existing is not news,
  // and the default one-month news window would miss every established player.
  const queries = buildQueries(startup);
  if (queries.length === 0) return { success: false, error: 'NOTHING_TO_RESEARCH' };

  const results = [];
  for (const q of queries) {
    const r = await tavilySearch(q, { topic: 'general', timeRange: null, maxResults: 6 });
    if (r.success) results.push(...r.results);
  }
  if (results.length === 0) {
    return { success: false, error: 'NO_RESULTS', detail: 'Nothing came back from the web for this venture.' };
  }

  // Deduplicate by URL: two queries often surface the same page.
  const seen = new Set();
  const unique = results.filter((r) => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  }).slice(0, 10);

  const context = unique
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${(r.content || '').slice(0, 600)}`)
    .join('\n\n');

  const ai = await callGroq(GROQ_MODEL, [
    {
      role: 'system',
      content: `You identify real competitors from web search results for a founder.

ABSOLUTE RULE: every company you name must appear in the provided search results. Do not name a company from your own knowledge, however obvious it seems. A name that is not in the results is a fabrication and is worse than returning fewer competitors.

If the results do not contain real comparable companies, return an empty competitors array and say so in market_gap. That is a correct answer, not a failure.

Return ONLY valid JSON:
{
  "competitors": [
    {"name": "...", "what_they_do": "one sentence", "url": "...", "how_they_differ": "one sentence on how they differ from this venture"}
  ],
  "market_gap": "2 to 3 sentences on what these companies collectively are NOT doing, that this venture could. Grounded in the results, not optimism. If they cover the space well, say that plainly."
}

Rules:
- At most 5 competitors, only genuinely comparable ones. A company in a loosely adjacent space is not a competitor.
- url must be copied exactly from the results.
- Never flatter the founder. If the space is crowded, say so.`,
    },
    {
      role: 'user',
      content: `THE VENTURE
Name: ${startup.name}
Field: ${(startup.domain || []).join(', ') || 'not stated'}
Problem: ${startup.problem || 'not stated'}
Solution: ${startup.solution || 'not stated'}
For: ${(startup.target_users || []).join(', ') || 'not stated'}

WEB SEARCH RESULTS
${context}`,
    },
  ], { temperature: 0.2, max_tokens: 2000 });

  if (!ai.success) return { success: false, error: 'RESEARCH_FAILED', detail: ai.detail || ai.error };

  let parsed;
  try {
    const cleaned = ai.content.replace(/```json|```/g, '').trim();
    const a = cleaned.indexOf('{');
    const b = cleaned.lastIndexOf('}');
    if (a === -1 || b === -1) throw new Error('no object');
    parsed = JSON.parse(cleaned.slice(a, b + 1));
  } catch {
    return { success: false, error: 'RESEARCH_UNPARSEABLE' };
  }
  if (!Array.isArray(parsed.competitors)) return { success: false, error: 'RESEARCH_INCOMPLETE' };

  // ENFORCE the no-fabrication rule rather than trusting the prompt. A named
  // company whose URL is not in the results we actually fetched is dropped,
  // because the entire value of this over the old inference version is that
  // every claim traces to something real.
  const allowedUrls = new Set(unique.map((r) => r.url));
  const verified = parsed.competitors.filter((c) => c && c.name && c.url && allowedUrls.has(c.url));
  const dropped = parsed.competitors.length - verified.length;
  if (dropped > 0) {
    console.warn(`Competitor research for ${startup.name}: dropped ${dropped} company/companies whose URL was not in the search results.`);
  }

  const sources = unique.map((r) => ({ title: r.title, url: r.url }));

  const saved = await pool.query(
    `INSERT INTO competitors
       (startup_id, comparable_category, comparable_players, potential_overlap,
        differentiation_opportunities, positioning_questions, source, algorithm_version,
        researched_competitors, research_sources, researched_at, market_gap)
     VALUES ($1, $2, $3, $4, $5, $6, 'RESEARCHED', 'competitor_research_v1', $7, $8, now(), $9)
     RETURNING *`,
    [
      startupId,
      (startup.domain || [])[0] || 'Unclassified',
      verified.map((c) => c.name),
      null,
      [],
      [],
      JSON.stringify(verified),
      JSON.stringify(sources),
      parsed.market_gap || null,
    ]
  );

  return { success: true, research: saved.rows[0], cached: false, dropped };
}

module.exports = { researchCompetitors };
