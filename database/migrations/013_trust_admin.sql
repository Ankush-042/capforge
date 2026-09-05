-- Migration 013: Trust/Verification + Admin (Sprints 22-23)

ALTER TABLE startups ADD COLUMN verification_status TEXT DEFAULT 'CLAIMED';
-- CLAIMED (founder-created, default) | PENDING_VERIFICATION | VERIFIED | UNVERIFIED (reserved for future imported/public listings)

ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;
