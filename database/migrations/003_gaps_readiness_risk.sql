-- Migration 003: Gap Diagnosis, Readiness, Risk (Sprint 3)
-- Ref: Architecture doc §25-30, AI/Intelligence spec §12-30, TRD §17-21, §27-30
--
-- SCOPED DECISION (documented, not hidden): full normalized skill/role taxonomy
-- tables (per architecture doc §22-23, profile_skills join table) are deferred
-- to Sprint 4 where semantic candidate matching genuinely needs them. For gap
-- diagnosis in this sprint, a denormalized `skills TEXT[]` on profiles is
-- sufficient and avoids premature complexity — this is a scoping call per
-- TRD §108's own dependency-order principle, not a shortcut on correctness.

ALTER TABLE profiles ADD COLUMN skills TEXT[] DEFAULT '{}';

-- Minimal team representation so gap diagnosis has real coverage data to
-- compare against, ahead of full Connections/Team Formation (Sprint 5).
-- The founder is auto-inserted as the first team member on startup creation.
CREATE TABLE startup_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  skills TEXT[] DEFAULT '{}',
  is_founder BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(startup_id, user_id)
);

CREATE TYPE gap_priority_level AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE gap_status AS ENUM ('OPEN', 'PARTIALLY_COVERED', 'FILLED', 'DISMISSED');

CREATE TABLE gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  priority_score NUMERIC NOT NULL,        -- 0.00–1.00, drives priority_level
  priority_level gap_priority_level NOT NULL,
  coverage NUMERIC NOT NULL DEFAULT 0,    -- 0.00–1.00
  reason TEXT NOT NULL,
  evidence JSONB,
  status gap_status NOT NULL DEFAULT 'OPEN',
  algorithm_version TEXT NOT NULL DEFAULT 'gap_diagnosis_v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE readiness_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  overall_score NUMERIC NOT NULL,   -- 0–100
  dimensions JSONB NOT NULL,        -- { team, problem, solution, market, execution, technical, business }
  critical_issues TEXT[] DEFAULT '{}',
  top_actions TEXT[] DEFAULT '{}',
  algorithm_version TEXT NOT NULL DEFAULT 'readiness_v1',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE risk_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE risk_category AS ENUM ('TEAM', 'EXECUTION', 'TECHNICAL', 'MARKET', 'BUSINESS');

CREATE TABLE risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  category risk_category NOT NULL,
  severity risk_severity NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_action TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gaps_startup_id ON gaps(startup_id);
CREATE INDEX idx_gaps_status ON gaps(status);
CREATE INDEX idx_readiness_startup_id ON readiness_assessments(startup_id);
CREATE INDEX idx_risks_startup_id ON risks(startup_id);
CREATE INDEX idx_team_members_startup_id ON startup_team_members(startup_id);
