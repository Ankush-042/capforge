-- Migration 014: True Semantic Search via pgvector embeddings (Sprint 26 part 2)
-- Ref: architecture doc's original deferral note from Sprint 2 — this closes it.

ALTER TABLE startups ADD COLUMN embedding vector(384);
ALTER TABLE profiles ADD COLUMN embedding vector(384);

CREATE INDEX idx_startups_embedding ON startups USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_profiles_embedding ON profiles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
