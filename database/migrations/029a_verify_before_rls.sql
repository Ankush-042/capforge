-- RUN THIS FIRST, ON ITS OWN. It changes nothing.
--
-- Before enabling RLS anywhere, confirm the role your backend actually
-- connects as can bypass it. If it cannot, enabling RLS with no policies
-- would make every query in the application return zero rows, which looks
-- exactly like total data loss even though nothing was deleted.
--
-- WHAT YOU WANT TO SEE: your connecting role with is_superuser = true OR
-- can_bypass_rls = true. If neither is true, STOP and say so rather than
-- running 029.

SELECT
  current_user                      AS connected_as,
  rolsuper                          AS is_superuser,
  rolbypassrls                      AS can_bypass_rls
FROM pg_roles
WHERE rolname = current_user;

-- And how many public tables currently have RLS off, which is what Supabase
-- is warning about.
SELECT
  COUNT(*) FILTER (WHERE NOT rowsecurity) AS tables_without_rls,
  COUNT(*)                                AS tables_total
FROM pg_tables
WHERE schemaname = 'public';
