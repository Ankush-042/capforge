-- Migration 036: rooms.
--
-- THE GAP THIS FILLS. Every relationship in CapForge is one-to-one and
-- private. Nobody knows anyone else exists unless they have been matched.
-- Every door is also high-stakes: "do you want to build this with me for
-- years" is the only interaction available. A contributor who is curious but
-- not ready to commit has no way to engage at all, and a founder stuck on one
-- question has nobody to ask.
--
-- Relationships do not usually start at commitment. Someone answers your
-- question, you talk, months later you build something. Helping is cheap and
-- committing is expensive, and cheap has to come first.
--
-- NO ROOMS TABLE, DELIBERATELY. Rooms are DERIVED from the domains actually in
-- use across ventures and contributor profiles, not stored as rows. That means
-- a venture in a domain nobody anticipated gets a room automatically, and a
-- domain nobody uses any more stops appearing, with no admin step and no
-- hardcoded list to fall out of date. A room is a string that enough people
-- share, not a record somebody created.
--
-- WHAT IS DELIBERATELY ABSENT: no upvotes, no karma, no ranking that reorders
-- posts by score. The moment posts compete, people write for the room instead
-- of asking what they actually need, and the one thing this is for is people
-- saying true things about decisions they are in the middle of.
--
-- There ARE reactions, but only one, and it means "this helped" rather than
-- "this is popular". It tells whoever answered that it landed. That is signal
-- for the author, not a scoreboard for the room.

CREATE TABLE room_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The domain slug, lowercased. Not a foreign key, because rooms are derived
  -- rather than stored.
  room TEXT NOT NULL,

  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- One field, not a title and a body. A title box makes people write
  -- headlines; a single box makes them write what they actually mean.
  body TEXT NOT NULL,

  -- Replies are flat, pointing at the post rather than at each other. Threads
  -- make a room tidy and kill its momentum.
  parent_id UUID REFERENCES room_posts(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,

  CONSTRAINT body_not_empty CHECK (length(trim(body)) > 0),
  CONSTRAINT body_reasonable CHECK (length(body) <= 4000)
);

CREATE INDEX idx_room_posts_room ON room_posts(room, created_at DESC);
CREATE INDEX idx_room_posts_parent ON room_posts(parent_id);
CREATE INDEX idx_room_posts_author ON room_posts(author_id);

-- "This helped." One row per person per post, so it counts people rather than
-- clicks, and so it can be undone.
CREATE TABLE room_post_helped (
  post_id UUID NOT NULL REFERENCES room_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Who was actually around. A room feels alive when you can see someone else
-- was here today, and dead silence is what kills a community faster than
-- anything else. One row per person per room, updated rather than appended.
CREATE TABLE room_presence (
  room TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room, user_id)
);
CREATE INDEX idx_room_presence_recent ON room_presence(room, last_seen_at DESC);

-- Consistent with migration 029.
ALTER TABLE room_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_post_helped ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_presence ENABLE ROW LEVEL SECURITY;
