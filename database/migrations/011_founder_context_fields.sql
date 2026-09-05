-- Migration 011: Deeper founder-provided venture context (Sprint B)
-- Ref: PRD §37 Founder Onboarding — funding status, team status, goals
-- were always in scope but never had real columns/UI built for them.

ALTER TABLE startups ADD COLUMN current_team_size INTEGER;
ALTER TABLE startups ADD COLUMN funding_raised NUMERIC;
ALTER TABLE startups ADD COLUMN funding_stage TEXT; -- 'Bootstrapped' | 'Pre-seed' | 'Seed' | 'Series A+'
ALTER TABLE startups ADD COLUMN target_timeline TEXT; -- e.g. 'MVP in 4 months'
ALTER TABLE startups ADD COLUMN equity_offered_range TEXT; -- e.g. '5-10% for a technical co-founder'
ALTER TABLE startups ADD COLUMN founder_domain_expertise TEXT[];
ALTER TABLE startups ADD COLUMN founder_prior_experience TEXT;
