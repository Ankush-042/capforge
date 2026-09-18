-- Migration 031: what has changed since you were last here.
--
-- Every screen in this product shows CURRENT STATE. Nothing anywhere shows a
-- DELTA. "Three new people match your Backend role since Tuesday" is the most
-- common reason a person reopens a product, and it did not exist.
--
-- THE DESIGN PROBLEM, and why two columns rather than one.
-- The obvious approach is a single last_seen_at updated on every request. That
-- breaks immediately: by the time the page renders, last_seen_at is now, so
-- nothing is ever new. The reference point has to stay still while you are
-- looking at it.
--
-- So: last_seen_at tracks activity continuously, and previous_session_at is
-- the stable point everything is measured against. It only moves when someone
-- returns after a real gap, which makes "since you were last here" mean what
-- it says for the whole time they are here.

ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN previous_session_at TIMESTAMPTZ;

CREATE INDEX idx_users_last_seen ON users(last_seen_at);
