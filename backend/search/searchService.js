/**
 * AI-12/AI-10 — Search & Discovery.
 * Ref: AI/Intelligence spec §38-41, SRS §34-36, architecture doc §63-64.
 *
 * SCOPED DECISION (documented, consistent with the Sprint 2 embedding
 * deferral): true vector/semantic search requires embeddings, which were
 * deferred pending Sprint 4-7 needing them for real. This sprint delivers:
 *   1. Full structured filter search — real, deterministic, SQL-based.
 *   2. A v1 natural-language layer that extracts recognizable terms
 *      (known domains/stages/skills already present in the platform's
 *      own data) from free text and converts them into structured
 *      filters — genuinely useful, but NOT vector similarity search.
 * This is stated plainly rather than calling keyword extraction
 * "semantic search," per AI spec §55 (never silently mixing what
 * something actually is with what it sounds like).
 *
 * VISIBILITY (SRS §36 — non-negotiable): search must never return
 * anything a user isn't authorized to see. Enforced in every query
 * below at the SQL level, not filtered client-side after the fact.
 */
const pool = require('../shared/db');

async function searchStartups({ domain, stage, fundingStage, role, skill, q }, requestingUserId) {
  const conditions = [`(status = 'ACTIVE' AND visibility = 'DISCOVERABLE')`];
  const params = [];
  let i = 1;

  // Owner can always see their own startups regardless of status/visibility.
  if (requestingUserId) {
    conditions[0] = `((status = 'ACTIVE' AND visibility = 'DISCOVERABLE') OR founder_id = $${i})`;
    params.push(requestingUserId);
    i++;
  }

  /**
   * DOMAIN IS MATCHED IN JS, not by SQL equality.
   *
   * This compared labels with LOWER(d) = ANY(...), exact equality. The
   * structuring step labels healthtech ventures 'healthcare', 'medical
   * technology' and 'telemedicine', so selecting healthtech in the filter
   * matched almost nothing and the dropdown appeared to do nothing at all.
   *
   * domainsMatch already knows these are the same field and is tested against
   * the real labels on the platform. The candidate set is small enough to
   * filter after the query rather than duplicating that logic in SQL, where
   * it would immediately drift from the version the rest of the engine uses.
   */
  let domainFilter = null;
  if (domain) {
    domainFilter = (Array.isArray(domain) ? domain : [domain]).map((d) => String(d).toLowerCase().trim());
  }

  if (stage) {
    conditions.push(`LOWER(stage) = LOWER($${i})`);
    params.push(stage);
    i++;
  }
  if (fundingStage) {
    conditions.push(`LOWER(funding_stage) = LOWER($${i})`);
    params.push(fundingStage);
    i++;
  }
  if (role) {
    // role_requirements is JSONB [{role, skills}] — search within it.
    conditions.push(`role_requirements::text ILIKE $${i}`);
    params.push(`%${role}%`);
    i++;
  }
  if (skill) {
    conditions.push(`role_requirements::text ILIKE $${i}`);
    params.push(`%${skill}%`);
    i++;
  }
  if (q) {
    conditions.push(`(name ILIKE $${i} OR problem ILIKE $${i} OR solution ILIKE $${i})`);
    params.push(`%${q}%`);
    i++;
  }

  const query = `SELECT id, name, problem, solution, domain, stage, business_model, status, created_at
                  FROM startups WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 50`;
  const result = await pool.query(query, params);

  // The field filter, applied with the same matcher the rest of the engine
  // uses, so 'healthtech' finds a venture labelled 'medical technology'.
  let rows = result.rows;
  if (domainFilter) {
    const { domainsMatch } = require('../matching/matchingService');
    rows = rows.filter((r) => (r.domain || []).some((label) =>
      domainFilter.some((want) => domainsMatch(want, String(label).toLowerCase().trim()))));
  }

  return { success: true, results: rows };
}

async function searchContributors({ skill, domain, stage, availability, q }) {
  const conditions = [`u.primary_role = 'CONTRIBUTOR'`, `p.visibility = 'DISCOVERABLE'`];
  const params = [];
  let i = 1;

  if (skill) {
    const skillList = (Array.isArray(skill) ? skill : [skill]).map(s => s.toLowerCase().trim());
    conditions.push(`EXISTS (SELECT 1 FROM unnest(p.skills) s WHERE LOWER(s) = ANY($${i}::text[]))`);
    params.push(skillList);
    i++;
  }
  if (domain) {
    const domainList = (Array.isArray(domain) ? domain : [domain]).map(d => d.toLowerCase().trim());
    conditions.push(`EXISTS (SELECT 1 FROM unnest(cp.preferred_domains) d WHERE LOWER(d) = ANY($${i}::text[]))`);
    params.push(domainList);
    i++;
  }
  if (stage) {
    conditions.push(`EXISTS (SELECT 1 FROM unnest(cp.preferred_stage) s WHERE LOWER(s) = LOWER($${i}))`);
    params.push(stage);
    i++;
  }
  if (availability) {
    conditions.push(`cp.availability = $${i}`);
    params.push(availability);
    i++;
  }
  if (q) {
    conditions.push(`(p.headline ILIKE $${i} OR p.bio ILIKE $${i})`);
    params.push(`%${q}%`);
    i++;
  }

  const query = `SELECT u.id as user_id, p.display_name, p.headline, p.skills, p.location,
                        cp.availability, cp.preferred_domains, cp.preferred_stage, cp.experience_years
                 FROM users u
                 JOIN profiles p ON p.user_id = u.id
                 JOIN contributor_profiles cp ON cp.profile_id = p.id
                 WHERE ${conditions.join(' AND ')} ORDER BY p.completion_score DESC LIMIT 50`;
  const result = await pool.query(query, params);
  return { success: true, results: result.rows };
}

async function searchInvestors({ domain, stage, q }) {
  const conditions = [`u.primary_role = 'INVESTOR'`, `p.visibility = 'DISCOVERABLE'`];
  const params = [];
  let i = 1;

  if (domain) {
    const domainList = (Array.isArray(domain) ? domain : [domain]).map(d => d.toLowerCase().trim());
    conditions.push(`EXISTS (SELECT 1 FROM unnest(ip.preferred_domains) d WHERE LOWER(d) = ANY($${i}::text[]))`);
    params.push(domainList);
    i++;
  }
  if (stage) {
    conditions.push(`EXISTS (SELECT 1 FROM unnest(ip.preferred_stages) s WHERE LOWER(s) = LOWER($${i}))`);
    params.push(stage);
    i++;
  }
  if (q) {
    conditions.push(`(p.headline ILIKE $${i} OR ip.thesis ILIKE $${i})`);
    params.push(`%${q}%`);
    i++;
  }

  const query = `SELECT u.id as user_id, p.display_name, p.headline,
                        ip.thesis, ip.preferred_domains, ip.preferred_stages, ip.ticket_min, ip.ticket_max
                 FROM users u
                 JOIN profiles p ON p.user_id = u.id
                 JOIN investor_profiles ip ON ip.profile_id = p.id
                 WHERE ${conditions.join(' AND ')} ORDER BY p.completion_score DESC LIMIT 50`;
  const result = await pool.query(query, params);
  return { success: true, results: result.rows };
}

/**
 * v1 natural-language interpretation: extracts known domain/stage terms
 * that actually appear in the platform's live startup data, plus a
 * generic keyword fallback. See module doc comment for the honest
 * scope of what this is (keyword extraction, not vector similarity).
 */
async function naturalLanguageSearchStartups(query) {
  const lower = query.toLowerCase();

  const domainRows = await pool.query(`SELECT DISTINCT LOWER(TRIM(unnest(domain))) as d FROM startups WHERE domain IS NOT NULL`);
  const knownDomains = domainRows.rows.map(r => r.d);
  const matchedDomains = knownDomains.filter(d => lower.includes(d));

  const knownStages = ['idea', 'prototype', 'mvp', 'early traction'];
  const matchedStage = knownStages.find(s => lower.includes(s));

  const filters = {};
  if (matchedDomains.length > 0) filters.domain = matchedDomains;
  if (matchedStage) filters.stage = matchedStage;
  if (Object.keys(filters).length === 0) filters.q = query; // fallback to plain keyword search

  const result = await searchStartups(filters, null);
  return { success: true, interpreted_filters: filters, results: result.results };
}

/**
 * REAL semantic search (Sprint 26 part 2) — this replaces the honest
 * "keyword extraction, not vector similarity" limitation documented
 * since Sprint 7. Uses pgvector's cosine distance operator against
 * real embeddings generated at structuring time.
 */
async function semanticSearchStartups(queryText, requestingUserId) {
  const { generateEmbedding } = require('../shared/embeddings');
  const queryEmbedding = await generateEmbedding(queryText);
  if (!queryEmbedding) return { success: false, error: 'EMBEDDING_FAILED' };

  const result = await pool.query(
    `SELECT id, name, problem, solution, domain, stage, business_model, status,
            1 - (embedding <=> $1::vector) as similarity
     FROM startups
     WHERE embedding IS NOT NULL
       AND ((status = 'ACTIVE' AND visibility = 'DISCOVERABLE') OR founder_id = $2)
     ORDER BY embedding <=> $1::vector
     LIMIT 20`,
    [JSON.stringify(queryEmbedding), requestingUserId]
  );

  /**
   * CUT WHERE RELEVANCE DOES, not at a fixed count.
   *
   * Reported from real use: searching "edtech" returned three genuinely
   * relevant ventures followed by seventeen unrelated ones, because the query
   * sorts by similarity and then takes twenty regardless of how similar any of
   * them are. Everything on the platform is SOME distance from any query, so
   * a fixed limit always returns a full page and most of it is noise.
   *
   * Two cuts, because either alone fails. A relative one, since a specific
   * query returns a tight cluster and a vague one does not, and the gap after
   * the good results is what marks the edge. And an absolute floor, because
   * when NOTHING is relevant the relative rule would happily return the least
   * irrelevant thing on the platform.
   */
  const rows = result.rows.map((r) => ({ ...r, similarity: parseFloat(r.similarity) }));
  const FLOOR = 0.30;          // below this it is not an answer to the question
  const SPREAD = 0.12;         // how far behind the best a result may fall

  const usable = rows.filter((r) => r.similarity >= FLOOR);
  const best = usable.length > 0 ? usable[0].similarity : 0;
  const results = usable.filter((r) => r.similarity >= best - SPREAD);

  return {
    success: true,
    results,
    method: 'semantic_embedding',
    // Said plainly, so an empty result reads as "nothing here is about that"
    // rather than as a broken search.
    considered: rows.length,
    cutOff: rows.length - results.length,
  };
}

module.exports = { searchStartups, searchContributors, searchInvestors, naturalLanguageSearchStartups, semanticSearchStartups };
