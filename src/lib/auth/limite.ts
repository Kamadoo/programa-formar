import 'server-only';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { sha256 } from '@/lib/cripto';

const JANELA_MIN = 15;
const MAX_FALHAS = 5;

/** Bloqueio progressivo por identificador (login digitado), guardado só como hash. */
export async function bloqueadoAte(identificador: string): Promise<Date | null> {
  const d = await db();
  const [t] = await d
    .select()
    .from(schema.tentativaLogin)
    .where(eq(schema.tentativaLogin.chave, sha256(identificador)))
    .limit(1);
  if (t?.bloqueadoAte && t.bloqueadoAte.getTime() > Date.now()) return t.bloqueadoAte;
  return null;
}

export async function registrarFalha(identificador: string) {
  const d = await db();
  const chave = sha256(identificador);
  const agora = new Date();
  const [t] = await d.select().from(schema.tentativaLogin).where(eq(schema.tentativaLogin.chave, chave)).limit(1);
  if (!t || agora.getTime() - t.janelaInicio.getTime() > JANELA_MIN * 60_000) {
    await d
      .insert(schema.tentativaLogin)
      .values({ chave, falhas: 1, janelaInicio: agora, bloqueadoAte: null })
      .onConflictDoUpdate({
        target: schema.tentativaLogin.chave,
        set: { falhas: 1, janelaInicio: agora, bloqueadoAte: null }
      });
    return;
  }
  const falhas = t.falhas + 1;
  // A partir de 5 falhas: 1, 2, 4, 8… minutos (máximo 60).
  const bloqueio =
    falhas >= MAX_FALHAS ? new Date(agora.getTime() + Math.min(60, 2 ** (falhas - MAX_FALHAS)) * 60_000) : null;
  await d
    .update(schema.tentativaLogin)
    .set({ falhas, bloqueadoAte: bloqueio })
    .where(eq(schema.tentativaLogin.chave, chave));
}

export async function limparFalhas(identificador: string) {
  const d = await db();
  await d.delete(schema.tentativaLogin).where(eq(schema.tentativaLogin.chave, sha256(identificador)));
}

/** Garante um tempo mínimo de resposta, para não revelar se a conta existe. */
export async function tempoMinimo<T>(ms: number, fn: () => Promise<T>): Promise<T> {
  const inicio = Date.now();
  try {
    return await fn();
  } finally {
    const resto = ms - (Date.now() - inicio);
    if (resto > 0) await new Promise(r => setTimeout(r, resto));
  }
}
