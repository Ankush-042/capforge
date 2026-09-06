-- Migration 021: Phase F — real saved searches for investors.
-- "Notify me when a new pre-seed fintech venture appears" is how real
-- angels/VCs actually operate — this stores that real intent.

CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at TIMESTAMPTZ
);
