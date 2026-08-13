-- Migration 002: Startup Core + AI Job tracking (Sprint 2)
-- Ref: Architecture doc §18-19, §46; TRD §14-16

CREATE TYPE startup_status AS ENUM ('DRAFT', 'ANALYZING', 'STRUCTURED', 'ACTIVE', 'ARCHIVED');
CREATE TYPE ai_job_status AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE ai_job_type AS ENUM ('IDEA_STRUCTURING', 'GAP_ANALYSIS', 'READINESS_ANALYSIS', 'COMPETITOR_ANALYSIS', 'MILESTONE_GENERATION');

CREATE TABLE startups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  raw_idea TEXT NOT NULL,

  -- Structured fields (AI-01 output, TRD §15)
  problem TEXT,
  solution TEXT,
  target_users TEXT[],
  domain TEXT[],
  business_model TEXT[],
  stage TEXT,
  required_roles TEXT[],
  required_skills TEXT[],
  technology_requirements TEXT[],
  risks TEXT[],
  confidence JSONB,
  clarification_needed TEXT[],

  -- Provenance: which fields were AI-inferred vs founder-confirmed (TRD §16)
  founder_confirmed BOOLEAN NOT NULL DEFAULT false,
  structured_at TIMESTAMPTZ,

  status startup_status NOT NULL DEFAULT 'DRAFT',
  visibility TEXT NOT NULL DEFAULT 'DISCOVERABLE',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
  job_type ai_job_type NOT NULL,
  status ai_job_status NOT NULL DEFAULT 'QUEUED',
  model TEXT,
  prompt_version TEXT,
  error TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_startups_founder_id ON startups(founder_id);
CREATE INDEX idx_startups_status ON startups(status);
CREATE INDEX idx_ai_jobs_startup_id ON ai_jobs(startup_id);
