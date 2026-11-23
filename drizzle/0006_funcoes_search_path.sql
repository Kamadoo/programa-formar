-- Funções com search_path fixo (vazio): impede que alguém crie objetos com o mesmo nome em outro
-- schema para "sequestrar" a execução. É o alerta "Function Search Path Mutable" do Security Advisor.
ALTER FUNCTION public.auditoria_bloqueia_alteracao() SET search_path = '';
--> statement-breakpoint
ALTER FUNCTION public.rls_em_tabelas_novas() SET search_path = '';
--> statement-breakpoint
-- Ninguém além do dono executa essas funções diretamente (elas só rodam pelos gatilhos).
REVOKE ALL ON FUNCTION public.auditoria_bloqueia_alteracao() FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.rls_em_tabelas_novas() FROM PUBLIC;
