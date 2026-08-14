-- Migration 004: Fix required_roles/required_skills flat-array design flaw (Sprint 3)
--
-- Root cause found via unit-testing the gap-diagnosis algorithm against
-- AI spec §75 scenarios: flat, unpaired required_roles[] + required_skills[]
-- meant a role's coverage calculation could match against skills that had
-- nothing to do with that role (e.g. "Sales Lead" showing 67% covered
-- because the team knew Python and Machine Learning). Fixed at the source:
-- the AI now returns role_requirements: [{role, skills}] pairs.
--
-- Only one test row exists in production at this point (pre-real-users),
-- so no backfill migration is needed — old columns are dropped cleanly.

ALTER TABLE startups ADD COLUMN role_requirements JSONB DEFAULT '[]';
ALTER TABLE startups DROP COLUMN required_roles;
ALTER TABLE startups DROP COLUMN required_skills;
ALTER TABLE startups DROP COLUMN confidence; -- re-added below with corrected key name for consistency
ALTER TABLE startups ADD COLUMN confidence JSONB;
