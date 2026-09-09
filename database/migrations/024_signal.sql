-- Migration 024: Phase 4, Signal.
--
-- Real, current market intelligence, grounded in live web search rather than
-- the model's training data. Two surfaces: a founder sees what is happening
-- in their domain right now, and an investor sees it for their thesis.
--
-- The caching design is the important part, and it is deliberate. Web search
-- costs real money per call and the free tier is 1000/month. So:
--
--   - The EXPENSIVE part (the actual web search) is cached at the
--     DOMAIN + STAGE level and shared across everyone who matches. Two
--     healthtech seed founders hit the same cached search results.
--   - The PERSONAL part (the synthesis) is generated per individual, keyed
--     to their specific weakest readiness dimension or exact thesis, and
--     cached separately per subject.
--
-- That way personalization stays real where it matters (the actual advice)
-- without multiplying the cost of the part that does not need to differ.

-- Shared, expensive: raw search results per domain+stage bucket.
CREATE TABLE signal_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,        -- e.g. 'healthcare|seed'
  domain TEXT NOT NULL,
  stage TEXT,
  results JSONB NOT NULL,                -- raw Tavily results, with real source URLs
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_signal_cache_key ON signal_search_cache(cache_key, expires_at DESC);

-- Personal, cheap: the synthesized read for one specific venture or investor.
CREATE TABLE signal_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type TEXT NOT NULL,            -- 'STARTUP' | 'INVESTOR'
  subject_id UUID NOT NULL,              -- startup id, or user id for an investor
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]',   -- real cited URLs, never invented
  based_on TEXT,                         -- what made this personal (e.g. weakest readiness dimension)
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT one_signal_per_subject UNIQUE (subject_type, subject_id)
);
CREATE INDEX idx_signal_insights_subject ON signal_insights(subject_type, subject_id);
