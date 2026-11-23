import 'server-only';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { sha256 } from '@/lib/cripto';

/** Link de senha de gestor (convite ou redefinição feita pelo administrador). */
export async function validarTokenGestor(token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const d = await db();
  const [t] = await d
    .select({ gestorId: s.tokenGestor.gestorId, nome: s.gestor.nome, email: s.gestor.email })
    .from(s.tokenGestor)
    .innerJoin(s.gestor, eq(s.gestor.id, s.tokenGestor.gestorId))
    .where(
      and(
        eq(s.tokenGestor.tokenHash, sha256(token)),
        isNull(s.tokenGestor.usadoEm),
        gt(s.tokenGestor.expiraEm, new Date()),
        eq(s.gestor.ativo, true)
      )
    )
    .limit(1);
  return t ?? null;
}
