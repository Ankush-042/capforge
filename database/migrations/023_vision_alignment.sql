-- Migration 023: Phase 3, Vision-Driven Co-Founder Matching.
--
-- The confirmed gap: co-founder matching is NOT identical to job matching
-- (weights genuinely differ, and compatibilityFit is a real 25% signal for
-- CO_FOUNDER gaps). But what compatibilityFit actually measures is
-- availability and equity-mindedness: "are you full-time" and "do you want
-- ownership". Those are LOGISTICS, not conviction.
--
-- Meanwhile founder_vision (on startups) and looking_for (on contributor
-- profiles) already exist, are already collected, are already displayed on
-- profile pages, and are used NOWHERE in scoring. Verified by direct grep
-- across the entire matching and embeddings layer: zero references.
--
-- The result is that a founder can write the most soul-baring statement of
-- why they are building this, and it has zero mathematical effect on who
-- ranks first for their co-founder search. Skill overlap decides a decision
-- that should be about shared conviction.
--
-- This adds a SECOND, separate embedding dimension computed specifically
-- between why-someone-is-building and why-someone-wants-to-build. It applies
-- ONLY to CO_FOUNDER gaps. CORE_HIRE, CONTRACTOR and ADVISOR scoring is
-- deliberately untouched: that path is proven and tested and is not being
-- reopened.

-- The founder's own stated reason for building this venture.
ALTER TABLE startups ADD COLUMN vision_embedding vector(384);

-- The contributor's own stated reason for wanting to build something.
ALTER TABLE contributor_profiles ADD COLUMN motivation_embedding vector(384);

CREATE INDEX idx_startups_vision_embedding ON startups USING ivfflat (vision_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_contributor_motivation_embedding ON contributor_profiles USING ivfflat (motivation_embedding vector_cosine_ops) WITH (lists = 100);
