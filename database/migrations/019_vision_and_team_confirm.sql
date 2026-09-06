-- Migration 019: Phase D — real vision/alignment fields + the actual
-- mutual-confirm mechanism replacing instant accept/reject.

-- Real, founder-stated vision — distinct from the AI's clinical
-- problem/solution parsing. This is what a co-founder actually needs
-- to feel aligned with, not a structured data field.
ALTER TABLE startups ADD COLUMN founder_vision TEXT;

-- Real, contributor-stated motivation — what KIND of mission/venture
-- they actually want to join, not just their skills.
ALTER TABLE contributor_profiles ADD COLUMN looking_for TEXT;

-- The real mutual-confirm mechanism (Phase D). A conversation can
-- reach a point where BOTH sides confirm they want to form a team —
-- this, not a single accept/reject click, is what actually triggers
-- team-join propagation.
ALTER TABLE conversations ADD COLUMN founder_confirmed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE conversations ADD COLUMN other_confirmed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE conversations ADD COLUMN team_formed_at TIMESTAMPTZ;
