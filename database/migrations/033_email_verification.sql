-- Migration 033: email verification that is deliberately not a barrier.
--
-- THE POLICY, stated here because the schema alone would not make it obvious
-- and someone reading this later needs to know it was a decision rather than
-- an oversight:
--
--   Verification EXISTS and genuinely works. A real address receives a real
--   link, clicking it genuinely marks the account verified.
--
--   Verification BLOCKS NOTHING. No route checks it. No feature is gated on
--   it. No badge is shown anywhere. Someone who never clicks the link has
--   exactly the same product as someone who does.
--
-- WHY. This is a three-sided marketplace at cold start, where the population
-- is currently zero. Gating signup, matching or posting behind a click in an
-- inbox would lose people the platform cannot afford to lose, to protect
-- against a problem it does not yet have. The honest position is: implement
-- the mechanism properly, and choose not to enforce it yet. Enforcement is a
-- one-line policy change later, once there is something worth protecting.
--
-- The one thing verification is actually USED for is knowing whether we can
-- reach someone. Notifications only go to addresses that have been confirmed,
-- because sending to an unconfirmed address is at best pointless and at worst
-- sending someone else's data to a stranger who mistyped their email.
--
-- EXISTING ACCOUNTS ARE GRANDFATHERED. Every account that exists today,
-- including all seeded @seed.test accounts, is marked verified by this
-- migration. None of them has a reachable inbox and none of them should
-- suddenly behave differently.

ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;

CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- The token is stored HASHED, never in plaintext. A verification link is a
  -- credential: anyone holding it can confirm that address. Storing them raw
  -- means a database read is enough to verify accounts you do not own.
  token_hash TEXT NOT NULL UNIQUE,

  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_verification_user ON email_verification_tokens(user_id);
CREATE INDEX idx_verification_hash ON email_verification_tokens(token_hash);

ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Everyone who already exists keeps working exactly as before.
UPDATE users SET email_verified = true, email_verified_at = now() WHERE email_verified = false;
