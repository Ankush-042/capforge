-- Migration 012: Seeking Type + Compatibility dimension
-- Ref: direct feedback — matching currently reads as a generic job board;
-- the landing page already promises founder-compatibility as a core
-- feature, but the engine never actually scored it. This closes that gap.

ALTER TABLE gaps ADD COLUMN seeking_type TEXT DEFAULT 'CORE_HIRE';
-- Values: CO_FOUNDER | CORE_HIRE | CONTRACTOR | ADVISOR
