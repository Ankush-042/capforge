-- Migration 020: Phase E — real "who viewed your profile" signal.

CREATE TABLE profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profile_views_viewed_user ON profile_views(viewed_user_id, viewed_at DESC);
