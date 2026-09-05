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

async function searchStartups({ domain, stage, role, skill, q }, requestingUserId) {
  const conditions = [`(status = 'ACTIVE' AND visibility = 'DISCOVERABLE')`];
  const params = [];
  let i = 1;

  // Owner can always see their own startups regardless of status/visibility.
  if (requestingUserId) {
    conditions[0] = `((status = 'ACTIVE' AND visibility = 'DISCOVERABLE') OR founder_id = $${i})`;
    params.push(requestingUserId);
    i++;
  }

  if (domain) {
    const domainList = Array.isArray(domain) ? domain : [domain];
    conditions.push(`EXISTS (SELECT 1 FROM unnest(domain) d WHERE LOWER(d) = ANY($${i}::text[]))`);
    params.push(domainList.map(d => d.toLowerCase().trim()));
    i++;
  }
  if (stage) {
    conditions.push(`LOWER(stage) = LOWER($${i})`);
    params.push(stage);
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
  return { success: true, results: result.rows };
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
  return { success: true, results: result.rows, method: 'semantic_embedding' };
}

module.exports = { searchStartups, searchContributors, searchInvestors, naturalLanguageSearchStartups, semanticSearchStartups };
