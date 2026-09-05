-- Migration 016: Phase 1 — 4 PPT-named readiness dimensions + India localization
-- Ref: PPT Objective 1 (team composition/market positioning/product
-- readiness/funding readiness) and Gap 04 (Indian localization, DPIIT data)

ALTER TABLE startups ADD COLUMN dpiit_recognized BOOLEAN DEFAULT false;
ALTER TABLE startups ADD COLUMN city_tier TEXT; -- 'Tier I' | 'Tier II' | 'Tier III'
