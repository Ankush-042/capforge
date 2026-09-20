-- Migration 037: the engine stops being a pile of string rules.
--
-- WHY THIS EXISTS.
--
-- Every component of the score except one is a hand-written string heuristic:
--
--   skillFit   literal token overlap, so 'python' does not match
--              'adaptive algorithms' even for someone who obviously can do it
--   roleFit    a table of job titles, rewritten three times in one day
--              because real people write 'AI/ML Engineering, Data Analysis,
--              Product Development' and not 'Machine Learning Engineer'
--   domainFit  a table of equivalences that has to anticipate every word
--              anyone might use for a field
--
-- Each of those breaks the moment somebody writes something the table did not
-- anticipate, which is every real person. The seeded profiles pass because
-- they were written to match the tables, which makes the tests circular: the
-- engine scored a real signup at zero while passing every quality rule.
--
-- The ONE component that never broke is the LLM alignment layer. It read a
-- person's mission and correctly said 'you want AI for education, not ad
-- campaign management' with no table, no tokens and no maintenance.
--
-- So the LLM judges the match, and the deterministic scores become guardrails
-- rather than the mechanism. This is a cache for that judgement, keyed on the
-- content it was made from, so it is recomputed when either side actually
-- changes and never otherwise.
--
-- DEGRADATION IS THE POINT. When no judgement exists, for any reason at all,
-- the deterministic score stands exactly as it does today. The LLM makes the
-- engine better; it is never load-bearing.

CREATE TABLE match_judgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gap_id UUID NOT NULL REFERENCES gaps(id) ON DELETE CASCADE,

  -- 0.00 to 1.00: can this person do this job, and would they want it.
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 1),

  -- One sentence naming something real from their profile against something
  -- real in the role. Shown to people, so it must never be a band label.
  reason TEXT NOT NULL,

  -- What the model actually saw. A judgement is only valid for the text it
  -- was made from, so both sides are hashed and a change to either
  -- invalidates it without needing a manual purge.
  profile_hash TEXT NOT NULL,
  gap_hash TEXT NOT NULL,

  judged_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT one_judgement_per_pair UNIQUE (user_id, gap_id)
);

CREATE INDEX idx_match_judgements_user ON match_judgements(user_id);
CREATE INDEX idx_match_judgements_gap ON match_judgements(gap_id);

ALTER TABLE match_judgements ENABLE ROW LEVEL SECURITY;
