-- Migration 030: sparks stop being a chronological list.
--
-- TWO PROBLEMS.
--
-- 1. Sparks are the one place people choose what to build, and they were the
--    only part of the product the matching engine never touched. Ventures get
--    matched. Roles get matched. Contributors get matched. Sparks, which open
--    the entire flow, were ordered by created_at DESC and nothing else. A
--    backend engineer who cares about healthcare saw exactly the same feed as
--    a growth marketer who cares about retail.
--
-- 2. A founder posting a spark learned nothing. Silence could mean nobody saw
--    it, or that fifty people saw it and scrolled past. Those are completely
--    different problems with completely different fixes, and the product could
--    not tell them apart.
--
-- WHAT IS DELIBERATELY NOT HAPPENING HERE
-- Sparks were designed vision-first, with no scores shown, because that is
-- what separates this from a job board: you read an idea and decide whether it
-- lands, rather than being told it is a 73% match. Relevance is used to ORDER
-- the feed. It is never displayed. That distinction is the whole point.

CREATE TABLE spark_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spark_id UUID NOT NULL REFERENCES sparks(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One row per person per spark. A founder wants to know how many people
  -- have seen it, not how many times someone refreshed.
  CONSTRAINT one_view_per_person UNIQUE (spark_id, viewer_id)
);
CREATE INDEX idx_spark_views_spark ON spark_views(spark_id);

-- RLS, consistent with migration 029. The backend connects as postgres which
-- has BYPASSRLS, so this closes the anon REST path without affecting the app.
ALTER TABLE spark_views ENABLE ROW LEVEL SECURITY;
