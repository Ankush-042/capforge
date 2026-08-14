-- Migration 005: Matching Engine — recommendations table (Sprint 4)
-- Ref: Architecture doc §31-33, AI/Intelligence spec §20-23

CREATE TYPE recommendation_type AS ENUM ('CONTRIBUTOR', 'STARTUP', 'INVESTOR', 'OPPORTUNITY');

CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_gap_id UUID REFERENCES gaps(id) ON DELETE SET NULL,
  recommendation_type recommendation_type NOT NULL DEFAULT 'CONTRIBUTOR',
  score NUMERIC NOT NULL,          -- 0.00-1.00
  rank INTEGER NOT NULL,
  score_breakdown JSONB NOT NULL,  -- component scores, the actual scoring evidence
  explanation JSONB NOT NULL,      -- strengths[]/limitations[] derived FROM score_breakdown
  algorithm_version TEXT NOT NULL DEFAULT 'matching_v1',
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE/SAVED/DISMISSED/CONNECTED/EXPIRED
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recommendations_startup_id ON recommendations(startup_id);
CREATE INDEX idx_recommendations_target_user_id ON recommendations(target_user_id);
CREATE INDEX idx_recommendations_gap_id ON recommendations(source_gap_id);
