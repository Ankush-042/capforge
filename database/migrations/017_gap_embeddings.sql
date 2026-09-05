-- Migration 017: Phase 2 — real semantic matching (Objective 2 fix)
-- Ref: PPT Objective 2 explicitly requires "semantic retrieval... vector
-- similarity" driving gap-to-contributor matching, not preference/browsing.
-- Current matching is deterministic attribute-overlap only — this closes
-- that gap by giving gaps their own embedding to compare against.

ALTER TABLE gaps ADD COLUMN embedding vector(384);
CREATE INDEX idx_gaps_embedding ON gaps USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
