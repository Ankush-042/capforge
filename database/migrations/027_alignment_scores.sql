-- Migration 027: real alignment scoring, judged by an LLM and cached.
--
-- WHY THIS REPLACES EMBEDDINGS FOR THIS SIGNAL, proven with real data:
--
-- A contributor whose mission says "I want to work on something where the
-- software failing means a real person has a worse day... health, civic
-- infrastructure, anything where the stakes are physical. I have spent three
-- years making dashboards load faster and I am done with that" scored:
--
--     AdPilot (marketing dashboards)  38%
--     LogiChain (logistics)           36%
--     the healthcare venture          12%
--
-- The embedding ranked marketing dashboards highest for someone who
-- explicitly said they are done with dashboards. Sentence embeddings cannot
-- represent negation: "I do not want X" sits close to "X" in vector space.
-- Grounding the text in problem and domain was tried and made it slightly
-- worse. This is a structural limit of the approach, not a tuning problem.
--
-- An LLM reads it the way a person would. The cost is handled by caching:
-- alignment between a person's mission and a venture's vision only changes
-- when one of those texts changes, which is almost never. Scored once,
-- stored, read from the database on every re-rank after that.

CREATE TABLE alignment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,

  score NUMERIC NOT NULL,          -- 0.00 to 1.00
  reason TEXT NOT NULL,            -- one line, shown to the user. Never a bare number.

  -- Hashes of the exact text that was scored. When either changes, this row
  -- is stale and gets re-scored. Without this, editing a mission would leave
  -- a permanently wrong cached score.
  mission_hash TEXT NOT NULL,
  vision_hash TEXT NOT NULL,

  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_score_per_pair UNIQUE (user_id, startup_id)
);
CREATE INDEX idx_alignment_startup ON alignment_scores(startup_id);
CREATE INDEX idx_alignment_user ON alignment_scores(user_id);
