-- Verrouillage de l'API Data et rôle JDBC de l'application.
--
-- PostgreSQL : le superuser (postgres) contourne toujours le row-level security.
-- Cette migration ne change donc pas le compte encore utilisé au runtime.
-- Après application (toujours avec le compte actuel) :
--   1. Choisir un mot de passe hors dépôt :
--        ALTER ROLE yee_api PASSWORD '...';
--   2. Basculer SPRING_DATASOURCE_USERNAME vers yee_api.
-- yee_api n'est pas superuser et n'a pas BYPASSRLS. La politique yee_api_all
-- lui ouvre toutes les lignes : les droits métier restent dans Spring.
-- anon, authenticated et service_role n'ont plus de droits sur public, et
-- aucune politique RLS. Un GRANT oublié plus tard ne leur rend pas les lignes.
--
-- flyway_schema_history est exclu : Flyway doit pouvoir l'écrire sans politique.
-- Toute table créée ensuite doit répéter ENABLE + FORCE ROW LEVEL SECURITY
-- et CREATE POLICY yee_api_all ... TO yee_api.

DO $$
DECLARE
  app_table text;
  db_role text;
  api_roles text[] := ARRAY['anon', 'authenticated', 'service_role'];
BEGIN
  -- Créé une seule fois. Sur Supabase, le compte postgres n'est pas
  -- superuser : un second passage ne peut pas ALTER ROLE. Les attributs
  -- sont donc fixés à la création, et un rejeu ne touche plus le rôle.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'yee_api') THEN
    CREATE ROLE yee_api
      LOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOBYPASSRLS;
  END IF;

  EXECUTE format('GRANT CONNECT ON DATABASE %I TO yee_api', current_database());
  GRANT USAGE, CREATE ON SCHEMA public TO yee_api;

  FOREACH db_role IN ARRAY api_roles LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = db_role) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', db_role);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', db_role);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', db_role);
      EXECUTE format('REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM %I', db_role);
    END IF;
  END LOOP;

  REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
  REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
  REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC;

  FOR app_table IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> 'flyway_schema_history'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', app_table);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', app_table);
    EXECUTE format('DROP POLICY IF EXISTS yee_api_all ON public.%I', app_table);
    EXECUTE format(
      'CREATE POLICY yee_api_all ON public.%I FOR ALL TO yee_api USING (true) WITH CHECK (true)',
      app_table);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO yee_api',
      app_table);
  END LOOP;

  GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO yee_api;
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.flyway_schema_history TO yee_api;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO yee_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO yee_api;
