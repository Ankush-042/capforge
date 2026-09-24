-- Migration 039: launches, and the room that opens under one.
--
-- WHAT IS MISSING. A venture on this platform can hire somebody, pitch an
-- investor, or post an idea. It cannot ask anybody to USE what it built. So
-- every founder here goes off-platform to find their first users, which is
-- the hardest thing they do, while sitting inside a network of people who
-- care about exactly their field.
--
-- Y Combinator solved this internally and it is one of the most valuable
-- things they do. Every company in a batch does TWO launches: an internal one
-- to the community first, then a public one, and partners push founders to do
-- the internal one long before they feel ready. YC's own account: companies
-- often get their first 40-50 paying customers from the community, and with
-- them "the smartest early product feedback possible".
--
-- WHY A DISCUSSION RATHER THAN A FEEDBACK FORM. The first version of this
-- migration had a form: did you try it, would you use it again, what broke.
-- Three fixed questions, tidy, aggregatable. It was wrong. A form collects
-- statements; it cannot produce the thing that actually helps a founder,
-- which is people arguing with each other. Two testers hitting the same wall
-- never find out. Nobody can ask "which browser?". Nobody changes their mind
-- because somebody else said something sharper.
--
-- So what opens under a launch is a room. People talk, reply, disagree, and
-- the founder is in it with them.
--
-- AND THE FOUNDER DOES NOT READ ALL OF IT. Forty messages under a launch is a
-- job, not a gift. They ask instead: what is the main complaint, did anyone
-- mention pricing, is it the signup or the landing page. The assistant has
-- read every message and answers from it. That is the point of collecting a
-- discussion rather than a spreadsheet.

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
  -- Images inline, the same way avatars are stored. The reasoning is written
  -- out in migration 034 and has not changed: no object storage to provision,
  -- no second service that can be down during a demonstration. Shrunk in the
  -- browser before they are ever sent.
  images TEXT[] NOT NULL DEFAULT '{}',

  -- Said plainly so people react to the flow instead of reporting that the
  -- buttons do not save. Real early launches are honest about this.
  state launch_state NOT NULL DEFAULT 'INTERFACE',

  -- What the founder most wants to know. Not a form the visitor fills in: a
  -- line at the top of the room saying what would help most.
  asking_about TEXT,

  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,

  CONSTRAINT title_present CHECK (length(trim(title)) > 0),
  CONSTRAINT summary_present CHECK (length(trim(summary)) > 0),
  CONSTRAINT images_bounded CHECK (array_length(images, 1) IS NULL OR array_length(images, 1) <= 4)
);

CREATE INDEX idx_launches_startup ON launches(startup_id);
CREATE INDEX idx_launches_recent ON launches(posted_at DESC);

-- The room under a launch. Same shape as a circle thread, because it is the
-- same thing: flat replies against a post, no nesting, because threads make a
-- room tidy and kill its momentum.
CREATE TABLE launch_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id UUID NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES launch_comments(id) ON DELETE CASCADE,

  body TEXT NOT NULL,

  -- One optional fact, because it changes how every other word is read: did
  -- this person actually open the thing, or are they reacting to the
  -- description? Not a form, just a flag they can set.
  tried_it BOOLEAN,

  -- The founder marking that this genuinely helped. Same primitive as a
  -- circle post, and the first thing on a contributor's profile that is
  -- EARNED rather than self-declared.
  marked_helpful BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,

  CONSTRAINT body_present CHECK (length(trim(body)) > 0),
  CONSTRAINT body_bounded CHECK (length(body) <= 4000)
);

CREATE INDEX idx_launch_comments_launch ON launch_comments(launch_id, created_at DESC);
CREATE INDEX idx_launch_comments_parent ON launch_comments(parent_id);
CREATE INDEX idx_launch_comments_author ON launch_comments(author_id);

-- Closing the loop: a founder fixes something and tells the people who
-- raised it. Almost nothing does this, and it is what turns a one-off
-- comment into a relationship.
CREATE TABLE launch_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id UUID NOT NULL REFERENCES launches(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT update_body_present CHECK (length(trim(body)) > 0)
);
CREATE INDEX idx_launch_updates_launch ON launch_updates(launch_id, created_at DESC);

-- Consistent with migration 029.
ALTER TABLE launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE launch_updates ENABLE ROW LEVEL SECURITY;
