import 'server-only';
import { eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { usuarioCandidato } from '@/lib/dominio/regras';

/**
 * Usuário de login da gestão, pela mesma regra do portal: maria.silva, maria.silva2…
 * Gerado ao criar a conta (convite do administrador, `npm run admin`, seed e contas de teste) e não muda depois.
 */
export async function usuarioLivreGestor(nome: string): Promise<string> {
  const d = await db();
  for (let n = 1; n < 1000; n++) {
    const candidato = usuarioCandidato(nome, n);
    const [ja] = await d.select({ id: s.gestor.id }).from(s.gestor).where(eq(s.gestor.usuario, candidato)).limit(1);
    if (!ja) return candidato;
  }
  throw new Error('Não foi possível gerar o usuário.');
}
