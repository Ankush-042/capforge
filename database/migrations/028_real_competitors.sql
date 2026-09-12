-- Migration 028: real competitors, not reasoning.
--
-- The competitor page has always been honest that it was inference: it reads
-- the founder's own description, infers a plausible category, and suggests
-- plausible differentiation. It never looked up a single real company. The
-- page says so, which is better than pretending, but "here is a category you
-- probably sit in" is a long way from "here is who is actually doing this,
-- and here is what they are not doing".
--
-- The competitors table already has a `source` column separating
-- AI_INTERPRETED from verified fact, which is exactly the right distinction
-- and was clearly designed for this. These columns carry the researched half.
--
-- comparable_players TEXT[] holds names only. Real research needs a name, what
-- the company actually does, and a link to verify it, so it is structured
-- rather than a flat list.

ALTER TABLE competitors ADD COLUMN researched_competitors JSONB;
ALTER TABLE competitors ADD COLUMN research_sources JSONB;
ALTER TABLE competitors ADD COLUMN researched_at TIMESTAMPTZ;

-- Where the gap genuinely is, in plain words, grounded in what the research
-- actually found rather than inferred from the founder's own optimism.
ALTER TABLE competitors ADD COLUMN market_gap TEXT;
