-- Close the public REST API on every table.
--
-- Supabase exposes each table in the public schema over PostgREST at the
-- project URL, authorised by the anon key, which is public by design. A table
-- with Row Level Security off is therefore readable, editable and deletable by
-- anybody who has the URL, including users.password_hash.
--
-- CapForge never uses that API. The backend connects directly as the
-- postgres role, which bypasses RLS, so enabling it with NO policies leaves
-- the application untouched and denies the anon and authenticated roles
-- everything. That is the point: there is no legitimate client of this API.
--
-- Idempotent. Run it again after adding any table.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- Verification: this must return 0.
-- SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity;
