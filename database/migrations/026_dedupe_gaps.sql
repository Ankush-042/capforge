-- Migration 026: stop duplicate gaps and duplicate recommendations.
--
-- CONFIRMED IN LIVE TESTING: a contributor saw "LearnLoop — UX/UI Designer"
-- twice, at an identical 36%, in the same list. Also EcoCharge AI/ML
-- Engineer twice, LearnLoop Instructional Designer twice, and ClimateLens
-- Machine Learning Engineer twice.
--
-- Cause, verified against the schema: there was NO unique constraint on
-- gaps(startup_id, role) and none on recommendations either. Every re-run of
-- gap diagnosis could insert the same role again, and every re-rank could
-- insert a second recommendation row for the same person and gap.
--
-- Deduplicate first (keeping the oldest of each set and re-pointing
-- everything that references the newer duplicates), then add the constraints
-- so it cannot happen again.

-- === 1. Re-point recommendations away from duplicate gaps ===
WITH ranked_gaps AS (
  SELECT id, startup_id, role,
         FIRST_VALUE(id) OVER (PARTITION BY startup_id, lower(trim(role)) ORDER BY created_at ASC) AS keeper_id
  FROM gaps
)
UPDATE recommendations r
SET source_gap_id = rg.keeper_id
FROM ranked_gaps rg
WHERE r.source_gap_id = rg.id AND rg.id != rg.keeper_id;

-- === 2. Delete the duplicate gaps themselves ===
DELETE FROM gaps g
USING (
  SELECT id,
         FIRST_VALUE(id) OVER (PARTITION BY startup_id, lower(trim(role)) ORDER BY created_at ASC) AS keeper_id
  FROM gaps
) dup
WHERE g.id = dup.id AND dup.id != dup.keeper_id;

-- === 3. Delete duplicate recommendation rows (same person, same gap) ===
DELETE FROM recommendations r
USING (
  SELECT id,
         FIRST_VALUE(id) OVER (PARTITION BY source_gap_id, target_user_id ORDER BY created_at ASC) AS keeper_id
  FROM recommendations
  WHERE source_gap_id IS NOT NULL AND target_user_id IS NOT NULL
) dup
WHERE r.id = dup.id AND dup.id != dup.keeper_id;

-- === 4. Make it structurally impossible from now on ===
-- Case-insensitive on role, so "UX/UI Designer" and "ux/ui designer" cannot
-- both exist for the same venture.
CREATE UNIQUE INDEX idx_gaps_startup_role_unique ON gaps (startup_id, lower(trim(role)));

-- Deliberately NOT a partial index. A partial unique index would require
-- repeating its WHERE clause in every ON CONFLICT target, which is fragile.
-- Postgres already treats NULLs as distinct in unique indexes, so investor
-- recommendations (which have a NULL source_gap_id) are unaffected and can
-- still have many rows per user.
CREATE UNIQUE INDEX idx_recommendations_gap_target_unique
  ON recommendations (source_gap_id, target_user_id);
