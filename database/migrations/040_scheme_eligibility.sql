-- Migration 040: the three facts that decide government scheme eligibility.
--
-- India has a large non-dilutive funding system that almost nobody on this
-- platform knows exists. The Startup India Seed Fund Scheme alone carries a
-- ₹945 crore corpus disbursed through 300+ approved incubators, giving up to
-- ₹20 lakh as a grant and up to ₹50 lakh as convertible debt. DPIIT
-- recognition, which is free and takes days, additionally unlocks a
-- three-year income tax holiday under 80-IAC, an 80% rebate on patent fees,
-- self-certification under nine labour and three environment laws, and
-- government procurement preference.
--
-- The platform already stores dpiit_recognized and has done since migration
-- 016, where it contributes 0.15 of funding readiness and nothing else. These
-- three columns are what turn that single flag into a real answer, because
-- they are the facts nearly every scheme's published criteria turn on.
--
-- WHY THESE THREE AND NOTHING MORE. Every field here appears in the actual
-- published eligibility rules:
--   incorporation date   SISFS requires under 2 years; DPIIT under 10
--   entity type          a sole proprietorship is excluded everywhere
--   prior government money  SISFS excludes anyone who has taken more than
--                           ₹10 lakh from another central or state scheme
--
-- Anything a founder would have to guess at, or that no rule turns on, is not
-- asked for. All three are optional: an unanswered question produces "we
-- cannot check this" rather than a wrong verdict, which is the whole design
-- principle of the feature.

CREATE TYPE entity_type AS ENUM (
  'PRIVATE_LIMITED',        -- Companies Act 2013
  'LLP',                    -- LLP Act 2008
  'REGISTERED_PARTNERSHIP', -- Indian Partnership Act 1932
  'COOPERATIVE_SOCIETY',    -- added to DPIIT eligibility by the 2026 notification
  'SOLE_PROPRIETORSHIP',    -- explicitly excluded from DPIIT and SISFS
  'NOT_INCORPORATED'        -- most idea-stage ventures here
);

ALTER TABLE startups ADD COLUMN entity_type entity_type;
ALTER TABLE startups ADD COLUMN incorporation_date DATE;

-- In lakhs. SISFS excludes a startup that has received more than ₹10 lakh of
-- monetary support under any other central or state government scheme, so the
-- amount matters rather than a yes or no.
ALTER TABLE startups ADD COLUMN prior_govt_funding_lakhs NUMERIC;
