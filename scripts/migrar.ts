/**
 * Aplica as migrações no banco de PRODUÇÃO (DATABASE_URL).
 * Em desenvolvimento não precisa: o PGlite migra sozinho ao iniciar.
 *
 *   npm run db:migrate
 *
 * Use o pooler em modo SESSÃO (porta 5432) — o mesmo endereço do site. Não use o modo transação (6543).
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { opcoesSsl, semSslmode } from '@/db/ssl';

async function main() {
  const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('Defina DATABASE_URL (ou DATABASE_MIGRATION_URL) para migrar.');
  const pool = new Pool({ connectionString: semSslmode(url), max: 1, ssl: opcoesSsl(url) });
  const host = new URL(url).hostname;
  console.log(`Migrando ${host}…`);
  await migrate(drizzle(pool), { migrationsFolder: 'drizzle' });
  await pool.end();
  console.log('Migrações aplicadas.');
}

main().catch(e => {
  console.error('Erro:', e instanceof Error ? e.message : e);
  process.exit(1);
});
