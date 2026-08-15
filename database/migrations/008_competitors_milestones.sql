-- Migration 008: Competitor Analysis + Milestone Intelligence (Sprint 9)
-- Ref: AI/Intelligence spec §42-44, TRD §30, architecture doc §43-44

CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  comparable_category TEXT NOT NULL,
  comparable_players TEXT[],           -- generic/category-level, never fabricated specific unverified companies
  potential_overlap TEXT,
  differentiation_opportunities TEXT[],
  positioning_questions TEXT[],
  source TEXT NOT NULL DEFAULT 'AI_INTERPRETED', -- distinguishes AI inference from verified fact, PRD §16
  algorithm_version TEXT NOT NULL DEFAULT 'competitor_analysis_v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE milestone_status AS ENUM ('SUGGESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sequence_order INTEGER NOT NULL,
  status milestone_status NOT NULL DEFAULT 'SUGGESTED',
  due_date DATE,
  source TEXT NOT NULL DEFAULT 'AI',  -- AI | FOUNDER — founder edits must be tracked, never silently overwritten
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_competitors_startup_id ON competitors(startup_id);
CREATE INDEX idx_milestones_startup_id ON milestones(startup_id);
