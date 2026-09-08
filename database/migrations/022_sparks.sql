-- Migration 022: Phase 2, The First Act.
--
-- The confirmed core gap: everything built so far assumes the startup
-- ALREADY EXISTS. Gaps, readiness, matching, stats are all post-formation
-- tooling. The actual flow starts earlier, at the moment someone shares a
-- raw idea and another person decides they want to build it too. That
-- founding moment had no representation in the system at all: it was
-- collapsed into the same machinery as filling a tenth engineering hire.
--
-- A spark is deliberately NOT a startup. It has no AI structuring, no
-- diagnosed gaps, no readiness score, no domain taxonomy. It is a human
-- statement of intent. It only becomes a startup at the moment two people
-- commit to building it together.

CREATE TYPE spark_status AS ENUM ('OPEN', 'FORMING', 'FORMED', 'ARCHIVED');

CREATE TABLE sparks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- The human content. Deliberately plain text, not structured fields:
  -- the whole point is that this comes before structure exists.
  title TEXT NOT NULL,
  the_idea TEXT NOT NULL,           -- what they cannot stop thinking about
  why_me TEXT,                      -- why this person, why now
  looking_for TEXT,                 -- the kind of person they hope finds this

  -- Light, optional signal. Never required, never AI-generated at this stage.
  tags TEXT[] DEFAULT '{}',

  status spark_status NOT NULL DEFAULT 'OPEN',

  -- Set only when the spark actually becomes a real venture, closing the
  -- loop from the First Act into everything already built.
  formed_startup_id UUID REFERENCES startups(id) ON DELETE SET NULL,

  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sparks_author ON sparks(author_id);
CREATE INDEX idx_sparks_status ON sparks(status, created_at DESC);

-- Resonance is deliberately NOT an application. There is no accept/reject,
-- no ranking, no score. One person read an idea and said "I want in".
CREATE TABLE spark_resonances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spark_id UUID NOT NULL REFERENCES sparks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Why this idea landed for them, in their own words. This is the thing a
  -- job application never asks for.
  message TEXT NOT NULL,

  -- Links straight into the proven conversation system rather than inventing
  -- a parallel messaging path.
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Mutual commitment, mirroring the proven two-sided team-confirm pattern
  -- already working for gap-based team formation.
  author_committed BOOLEAN NOT NULL DEFAULT false,
  responder_committed BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_resonance_per_person UNIQUE (spark_id, user_id)
);
CREATE INDEX idx_resonances_spark ON spark_resonances(spark_id, created_at DESC);
CREATE INDEX idx_resonances_user ON spark_resonances(user_id);

-- Sparks are a first-class conversation context, alongside startup and gap.
ALTER TABLE conversations ADD COLUMN spark_id UUID REFERENCES sparks(id) ON DELETE SET NULL;
