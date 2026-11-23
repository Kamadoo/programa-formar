import 'server-only';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { env } from '@/lib/env';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

type Estado = { pronto: Promise<Db> };
const g = globalThis as unknown as { __formarDb?: Estado };

async function iniciar(): Promise<Db> {
  const { DATABASE_URL, PGLITE_DIR } = env();
  if (DATABASE_URL) {
    const { Pool } = await import('pg');
    const { opcoesSsl, semSslmode } = await import('./ssl');
    // Supabase + container sempre ligado (AWS Lightsail): pooler compartilhado em modo SESSÃO (porta 5432, IPv4).
    const pool = new Pool({
      connectionString: semSslmode(DATABASE_URL),
      ssl: opcoesSsl(DATABASE_URL),
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
      application_name: 'programa-formar'
    });
    pool.on('error', e => console.error('Erro no pool do banco:', e.message));
    return drizzlePg(pool, { schema });
  }
  // Desenvolvimento local: PostgreSQL embutido (PGlite), sem Docker.
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(PGLITE_DIR, { recursive: true });
  const client = new PGlite(PGLITE_DIR);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: 'drizzle' });
  return db as unknown as Db;
}

/** Conexão única por processo (sobrevive ao hot reload em desenvolvimento). */
export function db(): Promise<Db> {
  if (!g.__formarDb) g.__formarDb = { pronto: iniciar() };
  return g.__formarDb.pronto;
}

export { schema };
