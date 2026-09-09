/**
 * Phase 4: Signal.
 *
 * Real, current market intelligence grounded in live web search, not in the
 * model's training data. This is the one part of CapForge that genuinely
 * cannot be answered from what the AI already knows, because the whole point
 * is what is happening in a market right now.
 *
 * The caching split is deliberate and load-bearing:
 *   - The EXPENSIVE part (web search) is cached per domain+stage and shared.
 *     Two healthtech seed founders hit the same cached search.
 *   - The PERSONAL part (synthesis) is generated per subject, keyed to that
 *     founder's actual weakest readiness dimension or that investor's exact
 *     thesis, and cached separately.
 *
 * Everything cited is real. Sources come from the search results themselves,
 * never from the model, so a citation can always be clicked and checked.
 */
const pool = require('../shared/db');
const { callGroq } = require('../shared/aiClient');

const GROQ_MODEL = 'openai/gpt-oss-120b';
const SEARCH_CACHE_HOURS = 48;   // market context does not move hour to hour
const INSIGHT_CACHE_HOURS = 72;  // the personal read changes even less often

/**
 * Real Tavily web search. Deliberately uses search_depth 'basic' (1 credit,
 * not 2) and topic 'news' with a recent time_range, because stale results
 * would defeat the entire purpose of this feature.
 */
async function tavilySearch(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { success: false, error: 'TAVILY_NOT_CONFIGURED' };

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        query,
        search_depth: 'basic',   // 1 credit, not 2
        topic: 'news',
        time_range: 'month',     // genuinely current, not archival
        max_results: 6,
        include_answer: false,   // we synthesize ourselves, personalized
        include_raw_content: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { success: false, error: 'SEARCH_FAILED', detail: `${res.status}: ${body.slice(0, 200)}` };
    }
    const data = await res.json();
    return { success: true, results: data.results || [] };
  } catch (err) {
    return { success: false, error: 'SEARCH_ERROR', detail: err.message };
  }
}

/**
 * The shared, cached half. Returns raw search results for a domain+stage
 * bucket, hitting the network only when the cache is cold or stale.
 */
async function getMarketSearch(domain, stage) {
  const cacheKey = `${(domain || 'general').toLowerCase()}|${(stage || 'any').toLowerCase()}`;

  const cached = await pool.query(
    `SELECT results, fetched_at FROM signal_search_cache WHERE cache_key = $1 AND expires_at > now()`,
    [cacheKey]
  );
  if (cached.rows.length > 0) {
    return { success: true, results: cached.rows[0].results, cached: true, fetchedAt: cached.rows[0].fetched_at };
  }

  const query = `${domain} startup funding and market trends ${stage ? stage + ' stage' : ''} India 2026`;
  const search = await tavilySearch(query);
  if (!search.success) return search;

  await pool.query(
    `INSERT INTO signal_search_cache (cache_key, domain, stage, results, expires_at)
     VALUES ($1, $2, $3, $4, now() + interval '${SEARCH_CACHE_HOURS} hours')
     ON CONFLICT (cache_key) DO UPDATE SET results = EXCLUDED.results, fetched_at = now(), expires_at = EXCLUDED.expires_at`,
    [cacheKey, domain || 'general', stage || null, JSON.stringify(search.results)]
  );

  return { success: true, results: search.results, cached: false };
}

/** Extract only real, checkable sources from actual search results. */
function extractSources(results) {
  return (results || []).slice(0, 5).map(r => ({ title: r.title, url: r.url })).filter(s => s.url);
}

/**
 * The personal half. Synthesizes the shared search results against THIS
 * venture's actual situation, specifically its weakest readiness dimension,
 * so two founders in the same domain get genuinely different advice.
 */
async function getSignalForStartup(startupId, { force = false } = {}) {
  if (!force) {
    const cached = await pool.query(
      `SELECT * FROM signal_insights WHERE subject_type = 'STARTUP' AND subject_id = $1 AND expires_at > now()`,
      [startupId]
    );
    if (cached.rows.length > 0) return { success: true, signal: cached.rows[0], cached: true };
  }

  const startupRes = await pool.query(
    `SELECT s.id, s.name, s.domain, s.funding_stage, s.stage, s.problem, s.solution
     FROM startups s WHERE s.id = $1`,
    [startupId]
  );
  if (startupRes.rows.length === 0) return { success: false, error: 'NOT_FOUND' };
  const startup = startupRes.rows[0];

  // What makes this personal: the venture's actual weakest dimension.
  const readinessRes = await pool.query(
    `SELECT overall_score, dimensions FROM readiness_assessments WHERE startup_id = $1 ORDER BY generated_at DESC LIMIT 1`,
    [startupId]
  );
  let weakest = null;
  if (readinessRes.rows.length > 0 && readinessRes.rows[0].dimensions) {
    const dims = readinessRes.rows[0].dimensions;
    const entries = Object.entries(dims).filter(([, v]) => typeof v === 'number');
    if (entries.length > 0) weakest = entries.sort((a, b) => a[1] - b[1])[0][0];
  }

  const primaryDomain = Array.isArray(startup.domain) ? startup.domain[0] : startup.domain;
  const search = await getMarketSearch(primaryDomain, startup.funding_stage || startup.stage);
  if (!search.success) return search;

  const sources = extractSources(search.results);
  const context = (search.results || []).slice(0, 6)
    .map((r, i) => `[${i + 1}] ${r.title}\n${(r.content || '').slice(0, 500)}`)
    .join('\n\n');

  const ai = await callGroq(GROQ_MODEL, [
    {
      role: 'system',
      content: `You are a market analyst writing for one specific founder. Ground every claim in the provided search results only. Never invent statistics, company names, or figures that are not in the sources. If the sources do not support a point, leave it out rather than filling the gap.

Return ONLY valid JSON: {"headline": "...", "body": "..."}
- headline: one sharp sentence about what is actually happening in this market right now. Under 110 characters.
- body: 2 to 3 short paragraphs, plain prose, no markdown, no bullet points. Speak directly to this founder about what these developments mean for their specific situation. Be concrete and honest, including when the news is unfavourable.`,
    },
    {
      role: 'user',
      content: `VENTURE: ${startup.name}
DOMAIN: ${primaryDomain || 'unspecified'}
STAGE: ${startup.funding_stage || startup.stage || 'unspecified'}
PROBLEM THEY SOLVE: ${startup.problem || 'not yet structured'}
THEIR SOLUTION: ${startup.solution || 'not yet structured'}
${weakest ? `THEIR WEAKEST READINESS DIMENSION RIGHT NOW: ${weakest}. Weight your advice toward this.` : ''}

CURRENT MARKET SEARCH RESULTS:
${context}`,
    },
  ], { temperature: 0.4, max_tokens: 900 });

  if (!ai.success) return { success: false, error: 'SYNTHESIS_FAILED', detail: ai.detail || ai.error };

  let parsed;
  try {
    parsed = JSON.parse(ai.content.replace(/```json|```/g, '').trim());
  } catch {
    return { success: false, error: 'SYNTHESIS_UNPARSEABLE' };
  }
  if (!parsed.headline || !parsed.body) return { success: false, error: 'SYNTHESIS_INCOMPLETE' };

  const saved = await pool.query(
    `INSERT INTO signal_insights (subject_type, subject_id, headline, body, sources, based_on, expires_at)
     VALUES ('STARTUP', $1, $2, $3, $4, $5, now() + interval '${INSIGHT_CACHE_HOURS} hours')
     ON CONFLICT (subject_type, subject_id) DO UPDATE
       SET headline = EXCLUDED.headline, body = EXCLUDED.body, sources = EXCLUDED.sources,
           based_on = EXCLUDED.based_on, generated_at = now(), expires_at = EXCLUDED.expires_at
     RETURNING *`,
    [startupId, parsed.headline, parsed.body, JSON.stringify(sources), weakest || null]
  );

  return { success: true, signal: saved.rows[0], cached: false };
}

/**
 * Same shape, investor side. Personalized to their actual stated thesis
 * (domains, stages) rather than generic market news.
 */
async function getSignalForInvestor(userId, { force = false } = {}) {
  if (!force) {
    const cached = await pool.query(
      `SELECT * FROM signal_insights WHERE subject_type = 'INVESTOR' AND subject_id = $1 AND expires_at > now()`,
      [userId]
    );
    if (cached.rows.length > 0) return { success: true, signal: cached.rows[0], cached: true };
  }

  const profileRes = await pool.query(
    `SELECT ip.preferred_domains, ip.preferred_stages, ip.thesis, p.display_name
     FROM investor_profiles ip JOIN profiles p ON p.id = ip.profile_id
     WHERE p.user_id = $1`,
    [userId]
  );
  if (profileRes.rows.length === 0) return { success: false, error: 'NO_INVESTOR_PROFILE' };
  const inv = profileRes.rows[0];

  const primaryDomain = (inv.preferred_domains || [])[0];
  if (!primaryDomain) return { success: false, error: 'NO_THESIS_DOMAINS' };
  const primaryStage = (inv.preferred_stages || [])[0];

  const search = await getMarketSearch(primaryDomain, primaryStage);
  if (!search.success) return search;

  const sources = extractSources(search.results);
  const context = (search.results || []).slice(0, 6)
    .map((r, i) => `[${i + 1}] ${r.title}\n${(r.content || '').slice(0, 500)}`)
    .join('\n\n');

  const ai = await callGroq(GROQ_MODEL, [
    {
      role: 'system',
      content: `You are a market analyst writing for one specific early-stage investor. Ground every claim in the provided search results only. Never invent statistics, fund names, or deal figures that are not in the sources.

Return ONLY valid JSON: {"headline": "...", "body": "..."}
- headline: one sharp sentence on what is moving in this investor's space right now. Under 110 characters.
- body: 2 to 3 short paragraphs, plain prose, no markdown, no bullets. Speak to what these developments mean for deploying capital against their stated thesis. Be honest about risk, not promotional.`,
    },
    {
      role: 'user',
      content: `INVESTOR THESIS
DOMAINS: ${(inv.preferred_domains || []).join(', ')}
STAGES: ${(inv.preferred_stages || []).join(', ') || 'unspecified'}
STATED THESIS: ${inv.thesis || 'not stated'}

CURRENT MARKET SEARCH RESULTS:
${context}`,
    },
  ], { temperature: 0.4, max_tokens: 900 });

  if (!ai.success) return { success: false, error: 'SYNTHESIS_FAILED', detail: ai.detail || ai.error };

  let parsed;
  try {
    parsed = JSON.parse(ai.content.replace(/```json|```/g, '').trim());
  } catch {
    return { success: false, error: 'SYNTHESIS_UNPARSEABLE' };
  }
  if (!parsed.headline || !parsed.body) return { success: false, error: 'SYNTHESIS_INCOMPLETE' };

  const saved = await pool.query(
    `INSERT INTO signal_insights (subject_type, subject_id, headline, body, sources, based_on, expires_at)
     VALUES ('INVESTOR', $1, $2, $3, $4, $5, now() + interval '${INSIGHT_CACHE_HOURS} hours')
     ON CONFLICT (subject_type, subject_id) DO UPDATE
       SET headline = EXCLUDED.headline, body = EXCLUDED.body, sources = EXCLUDED.sources,
           based_on = EXCLUDED.based_on, generated_at = now(), expires_at = EXCLUDED.expires_at
     RETURNING *`,
    [userId, parsed.headline, parsed.body, JSON.stringify(sources), primaryDomain]
  );

  return { success: true, signal: saved.rows[0], cached: false };
}

module.exports = { getSignalForStartup, getSignalForInvestor, tavilySearch };
