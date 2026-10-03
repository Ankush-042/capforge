-- Circles anybody can start.
--
-- Rooms were derived entirely from the domains in use: a room existed once
-- two people shared a field, and nobody could create one. That is a sensible
-- default and it means a field nobody has picked yet has nowhere to talk,
-- even when somebody wants to start it.
--
-- Any member can now open one. A circle nobody joins simply sits there; a
-- circle that takes off is content nobody had to plan.
--
-- The slug is unique, so two people creating the same room land in the same
-- place rather than making two.
CREATE TABLE member_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_member_rooms_slug ON member_rooms(slug);
