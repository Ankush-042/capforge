-- Migration 007: Notifications + Feedback Loop (Sprint 8)
-- Ref: Architecture doc §37-42, §61-62, AI/Intelligence spec §49-52

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Feedback: explicit user actions on recommendations, the raw signal
-- the adaptive ranking adjustment (AI spec §50-52) is built from.
CREATE TABLE recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- VIEW/SAVE/INTEREST/DISMISS/CONNECT/REJECT
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_user_id ON recommendation_feedback(user_id);
CREATE INDEX idx_feedback_recommendation_id ON recommendation_feedback(recommendation_id);

-- Per-user, per-skill/domain preference adjustment — the "memory" the
-- feedback loop writes to and the ranking engine reads from.
CREATE TABLE user_preference_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signal_key TEXT NOT NULL,       -- e.g. "domain:food service", "stage:mvp"
  adjustment NUMERIC NOT NULL DEFAULT 0,  -- bounded, see feedbackService.js
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, signal_key)
);
