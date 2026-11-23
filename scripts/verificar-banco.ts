/**
 * Confere a blindagem do banco (rode depois de cada migração em produção):
 *  - toda tabela do schema public com RLS ligado;
 *  - os papéis da API automática do Supabase (anon, authenticated) sem nenhum privilégio;
 *  - auditoria protegida contra alteração e exclusão.
 *
 *   npm run db:verificar
 */
import { Pool } from 'pg';
import { opcoesSsl, semSslmode } from '@/db/ssl';

async function main() {
  const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('Defina DATABASE_URL.');
  const pool = new Pool({ connectionString: semSslmode(url), max: 1, ssl: opcoesSsl(url) });
  const problemas: string[] = [];

  const semRls = await pool.query(
    `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`
  );
  for (const r of semRls.rows) problemas.push(`Tabela sem RLS: ${r.relname}`);

  const papeis = await pool.query(`select rolname from pg_roles where rolname in ('anon', 'authenticated')`);
  for (const { rolname } of papeis.rows) {
    const p = await pool.query(
      `select table_name, privilege_type from information_schema.role_table_grants
       where table_schema = 'public' and grantee = $1`,
      [rolname]
    );
    for (const r of p.rows) problemas.push(`${rolname} tem ${r.privilege_type} em ${r.table_name}`);
  }

  const gatilho = await pool.query(`select 1 from pg_trigger where tgname = 'auditoria_imutavel'`);
  if (!gatilho.rowCount) problemas.push('Gatilho auditoria_imutavel não encontrado');

  // Funções do schema public sem search_path fixo (alerta do Security Advisor).
  const funcoes = await pool.query(
    `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and not exists (
       select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`
  );
  for (const r of funcoes.rows) problemas.push(`Função sem search_path fixo: ${r.proname}`);

  // Tabelas publicadas no Realtime (vazariam alterações para quem assinasse o canal).
  const realtime = await pool.query(
    `select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'`
  );
  for (const r of realtime.rows) problemas.push(`Tabela publicada no Realtime: ${r.tablename}`);

  await pool.end();
  if (problemas.length) {
    console.error('Problemas encontrados:\n- ' + problemas.join('\n- '));
    process.exit(1);
  }
  console.log(
    'Banco blindado: RLS em todas as tabelas, API automática sem acesso, funções protegidas, nada no Realtime e auditoria imutável.'
  );
}

main().catch(e => {
  console.error('Erro:', e instanceof Error ? e.message : e);
  process.exit(1);
});
