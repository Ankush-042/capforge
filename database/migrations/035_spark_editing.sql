-- Migration 035: a spark can be rewritten and given another chance.
--
-- THE PROBLEM. A spark could not be edited. The composer even told people
-- "you can edit or archive this at any time", which was removed in an earlier
-- commit because it was false. So a founder whose first attempt at describing
-- their idea did not land was stuck with it permanently.
--
-- That matters more than it sounds. The first attempt at describing an idea is
-- almost always the worst one: it is written before anyone has reacted to it,
-- before the author has had to explain it out loud, before they know which
-- part people find confusing. A spark's entire job is converting a stranger's
-- attention into a conversation, and the single highest-leverage thing for
-- that is letting someone fix what did not work.
--
-- WHAT IS DELIBERATELY NOT HAPPENING. There is no edit history and no "edited"
-- badge. Both would be honest, and both are wrong here: a badge implies
-- suspicion about an author improving their own raw idea, which is exactly the
-- behaviour we want. What IS tracked is how many times it has been reworked,
-- privately, so resurfacing can be rate-limited.
--
-- RESURFACING. Editing alone changes nothing if the spark stays buried by
-- recency ordering. So a rewrite can lift it back into the feed, ONCE per
-- rewrite and no more often than the cooldown below. Without that limit,
-- editing becomes a bump button and the feed becomes whoever edits most.

ALTER TABLE sparks ADD COLUMN edited_at TIMESTAMPTZ;
ALTER TABLE sparks ADD COLUMN edit_count INTEGER NOT NULL DEFAULT 0;

-- When the spark was last lifted back into the feed. Ordering treats this as
-- the spark's effective age, so a genuine rewrite gets seen again without the
-- original post date being falsified.
ALTER TABLE sparks ADD COLUMN resurfaced_at TIMESTAMPTZ;

CREATE INDEX idx_sparks_resurfaced ON sparks(resurfaced_at);
