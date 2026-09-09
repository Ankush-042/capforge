-- Migration 025: Pitch Mode becomes usable.
--
-- Two confirmed gaps from testing:
--
-- 1. Pitch Mode was only reachable from the FOUNDER's own sidebar, which
--    makes it useless: it is the one screen whose entire purpose is to be
--    seen by someone else. A founder looking at their own pitch does
--    nothing. It now gets sent inside the conversation the founder and
--    investor are already having, which is the correct sequence: the
--    investor explores, they chat, and only if it is going well does the
--    founder pitch. Nobody pitches to a stranger.
--
-- 2. The pitch is the founder's own. They must be able to edit it. Right
--    now every word is auto-derived from structured data with no way to
--    add their own framing.

-- The founder's own words, overriding or adding to the auto-derived pitch.
-- Deliberately nullable throughout: an unedited pitch falls back to the real
-- structured data exactly as it does today, so nothing breaks for a founder
-- who never touches this.
CREATE TABLE pitch_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL UNIQUE REFERENCES startups(id) ON DELETE CASCADE,

  headline TEXT,            -- overrides the venture name as the opening line
  the_ask TEXT,             -- what they are actually raising and why. Has no auto-derived equivalent.
  problem_override TEXT,    -- founder's own framing of the problem
  solution_override TEXT,   -- founder's own framing of the solution
  closing TEXT,             -- the last thing they want an investor to read

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A message can now BE a pitch, so it renders as a real card in the thread
-- rather than as a bare link somebody has to notice.
ALTER TABLE messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'TEXT';
ALTER TABLE messages ADD COLUMN pitch_startup_id UUID REFERENCES startups(id) ON DELETE SET NULL;
