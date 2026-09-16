-- Migration 029: close the Supabase public-API hole.
--
-- WHAT SUPABASE FLAGGED
-- Supabase auto-generates a PostgREST API at
-- https://<project-ref>.supabase.co/rest/v1/<table> for every table in the
-- public schema. With Row-Level Security disabled, anyone holding the
-- project's anon key can read, edit and delete every row in every table:
-- users, conversations, sparks, alignment scores, all of it.
--
-- WHY THIS IS SAFE FOR THIS APP, verified rather than assumed
-- The backend connects directly as the `postgres` role via DATABASE_URL, and
-- that role is a superuser which BYPASSES RLS entirely. The frontend contains
-- no Supabase client and never touches the REST API; it only calls the
-- Express backend. So enabling RLS closes the anon hole and changes nothing
-- about how this application reads or writes.
--
-- NO POLICIES ARE CREATED, DELIBERATELY
-- RLS with no policy means: deny everything, for every role RLS applies to.
-- That is exactly what is wanted here. Authorisation in this product lives in
-- the Express layer, which already enforces ownership on every route,
-- including the co-founder rule. Adding permissive policies would reopen the
-- hole this migration exists to close.
--
-- IF THE BACKEND EVER MOVES to a non-superuser role, or if a Supabase client
-- is ever added to the frontend, real policies will be needed and this
-- migration must be revisited BEFORE that happens, not after.

DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    -- DELIBERATELY NOT using FORCE ROW LEVEL SECURITY. FORCE removes the
    -- table-owner bypass, and if the connecting role turns out to be the
    -- owner without BYPASSRLS, every query in the application would return
    -- zero rows. Plain ENABLE closes the anon REST hole, which is the actual
    -- problem, without betting the whole app on an assumption about role
    -- attributes. Run 000_verify_before_rls.sql first.
  END LOOP;
END $$;
