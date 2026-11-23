-- Blindagem para Postgres gerenciado (Supabase).
-- O site só acessa o banco pelo servidor, com o papel dono das tabelas (que ignora RLS).
-- 1) RLS ligado em todas as tabelas, sem nenhuma política: qualquer outro papel não lê nem grava nada.
-- 2) Se existirem os papéis da API automática do Supabase (anon, authenticated), tiramos todo acesso deles.
-- Em desenvolvimento (PGlite) esses papéis não existem e o bloco 2 não faz nada.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END
$$;
--> statement-breakpoint
DO $$
DECLARE
  papel text;
BEGIN
  FOREACH papel IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = papel) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', papel);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', papel);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', papel);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', papel);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', papel);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', papel);
    END IF;
  END LOOP;
END
$$;
--> statement-breakpoint
-- Tabelas criadas no futuro também nascem com RLS ligado.
CREATE OR REPLACE FUNCTION public.rls_em_tabelas_novas() RETURNS event_trigger
LANGUAGE plpgsql AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'CREATE TABLE' AND schema_name = 'public' LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', obj.object_identity);
  END LOOP;
END;
$$;
--> statement-breakpoint
DO $$
BEGIN
  -- Gatilhos de evento exigem privilégio especial; se o ambiente não permitir, segue sem ele
  -- (o teste de blindagem em scripts/verificar-banco.ts acusa tabelas sem RLS).
  CREATE EVENT TRIGGER rls_em_tabelas_novas ON ddl_command_end WHEN TAG IN ('CREATE TABLE') EXECUTE FUNCTION public.rls_em_tabelas_novas();
EXCEPTION WHEN insufficient_privilege OR feature_not_supported OR duplicate_object THEN
  RAISE NOTICE 'Gatilho de evento não criado: %', SQLERRM;
END
$$;
