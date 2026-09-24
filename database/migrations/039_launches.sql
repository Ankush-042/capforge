-- Migration 039: launches.
--
-- WHAT IS MISSING. A venture on this platform can hire someone, pitch an
-- investor, or post an idea. It cannot ask anybody to USE what it built. So
-- every founder here goes off-platform to find their first users, which is
-- the hardest thing they do, while sitting inside a network of people who
-- care about exactly their field.
--
-- Y Combinator solved this internally and it is one of the most valuable
-- things they do. Every company in a batch does TWO launches: a "Launch
-- Bookface" to the community first, then a public launch, and partners push
-- founders to do the internal one long before they feel ready. YC's own
-- description of the result: companies often get their first 40-50 paying
-- customers from the community, and with them "the smartest early product
-- feedback possible".
--
-- This is that, for CapForge. The feedback matters as much as the users.
--
-- WHY THE FEEDBACK IS STRUCTURED RATHER THAN A COMMENT BOX. "Cool idea,
-- congrats" is worthless and it is what an open comment box produces. Three
-- specific questions, always the same three, produce something a founder can
-- act on and something that aggregates: did you actually try it, would you
-- use it again, what broke or confused you.

CREATE TYPE launch_state AS ENUM (
  'CONCEPT',      -- a description, nothing to click yet
  'INTERFACE',    -- clickable screens, nothing behind them
  'PROTOTYPE',    -- partly working
  'LIVE'          -- real, usable
);

CREATE TABLE launches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  summary TEXT NOT NULL,           -- what it is, in the founder's words

  link TEXT,                       -- where to try it
  -- Images are stored the same way avatars are: small, inline, no object
  -- storage to provision. The reasoning is written out in migration 034 and
  -- has not changed. Capped in code before they are ever sent.
  images TEXT[] NOT NULL DEFAULT '{}',

  -- Said plainly so testers give useful feedback instead of reporting that
  -- the buttons do not save. Real early launches are honest about this.
  state launch_state NOT NULL DEFAULT 'INTERFACE',

  -- The founder's own questions. Generic feedback is weak feedback; asking
  -- for something specific is what turns vague praise into an answer.
  questions TEXT[] NOT NULL DEFAULT '{}',

  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,           -- the founder stopped collecting feedback

  CONSTRAINT title_present CHECK (length(trim(title)) > 0),
  CONSTRAINT summary_present CHECK (length(trim(summary)) > 0),
  CONSTRAINT images_bounded CHECK (array_length(images, 1) IS NULL OR array_length(images, 1) <= 4)
);

CREATE INDEX idx_launches_startup ON launches(startup_id);
CREATE INDEX idx_launches_recent ON launches(posted_at DESC);

CREATE TABLE launch_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id UUID NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- The three questions, always the same three.
  tried BOOLEAN NOT NULL,          -- did you actually open it
  would_use_again BOOLEAN,         -- null when they did not try it
  what_happened TEXT NOT NULL,     -- what broke, what confused you, what worked

  -- Their answers to the founder's own questions, in the same order.
  answers TEXT[] NOT NULL DEFAULT '{}',

  -- The founder marking that this genuinely helped. Same primitive as a
  -- circle post, and the first thing on a contributor's profile that is
  -- EARNED rather than self-declared: somebody else said it was useful.
  marked_helpful BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT what_happened_present CHECK (length(trim(what_happened)) > 0),
  CONSTRAINT one_per_person UNIQUE (launch_id, user_id)
);

CREATE INDEX idx_launch_feedback_launch ON launch_feedback(launch_id, created_at DESC);
CREATE INDEX idx_launch_feedback_user ON launch_feedback(user_id);

-- Closing the loop: a founder fixes something and tells the people who
-- reported it. Almost nothing does this, and it is what turns a one-off
-- comment into a relationship.
CREATE TABLE launch_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id UUID NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT body_present CHECK (length(trim(body)) > 0)
);
CREATE INDEX idx_launch_updates_launch ON launch_updates(launch_id, created_at DESC);

-- Consistent with migration 029.
ALTER TABLE launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_updates ENABLE ROW LEVEL SECURITY;
