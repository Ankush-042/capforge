-- Migration 032: an investor can finally track anything.
--
-- TWO PROBLEMS, one fix.
--
-- 1. An investor could browse and message and nothing else. They could not
--    mark a venture they were watching, record why they passed on one, or be
--    told when something they liked crossed the readiness bar. Every other
--    role on this platform has state; the investor had none.
--
-- 2. The portfolio page reads from the `connections` table, which no live
--    route has written to since the conversation flow replaced it. That is
--    the FOURTH place this dead table was still being read: the contributor
--    dashboard, the investor dashboard and the admin panel were all fixed
--    earlier. An investor's portfolio was therefore permanently empty.
--
-- The honest replacement for "portfolio" on a platform that does not process
-- actual investments is what an investor is actually tracking: ventures they
-- are watching, and ventures they have deliberately passed on with a reason.
-- Claiming to show holdings we have no knowledge of would be a lie.

CREATE TYPE watch_status AS ENUM ('WATCHING', 'PASSED');

CREATE TABLE investor_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,

  status watch_status NOT NULL DEFAULT 'WATCHING',

  -- Why they passed, in their own words. An investor looking at the same
  -- venture six months later needs to remember what put them off, and that
  -- reasoning is worth more than the fact of the pass.
  note TEXT,

  -- The readiness when they started watching, so "it has moved since you
  -- started watching" is computable rather than guessed at.
  readiness_at_watch INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT one_entry_per_venture UNIQUE (investor_id, startup_id)
);

CREATE INDEX idx_watchlist_investor ON investor_watchlist(investor_id, status);
CREATE INDEX idx_watchlist_startup ON investor_watchlist(startup_id);

-- Consistent with migration 029: the backend connects as postgres which has
-- BYPASSRLS, so this closes the anon REST path without affecting the app.
ALTER TABLE investor_watchlist ENABLE ROW LEVEL SECURITY;
