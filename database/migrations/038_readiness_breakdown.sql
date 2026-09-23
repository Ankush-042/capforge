-- Migration 038: store how a readiness score was reached.
--
-- computeReadiness already builds a per-dimension justification and then
-- throws it away: the insert saves only overall_score, dimensions,
-- critical_issues and top_actions. So a founder reading their score can see
-- four numbers and nothing about where any of them came from, and the
-- reasoning the engine genuinely produced is discarded on every run.
--
-- This column holds the arithmetic: every sub-factor, its value, the weight
-- applied, whether that weight came from published data or from our own
-- judgement, and the sources. It is what makes "why is my score 42?" a
-- question with an answer.
--
-- Nullable, because every assessment already stored predates it and there is
-- no honest way to reconstruct the reasoning for a score computed by a
-- previous version of the engine.

ALTER TABLE readiness_assessments ADD COLUMN breakdown JSONB;
