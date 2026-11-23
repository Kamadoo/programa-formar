import 'server-only';
import { db, schema, type Tx } from '@/db';

type Registro = {
  atorTipo: 'gestor' | 'servidor' | 'sistema' | 'publico';
  atorId?: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  detalhes?: Record<string, unknown>;
};

/** Grava na auditoria (tabela só de inclusão). Nunca passe CPF, senha ou token em `detalhes`. */
export async function auditar(r: Registro, tx?: Tx) {
  const alvo = tx ?? (await db());
  await alvo.insert(schema.auditoria).values({
    atorTipo: r.atorTipo,
    atorId: r.atorId ?? null,
    acao: r.acao,
    entidade: r.entidade,
    entidadeId: r.entidadeId ?? null,
    detalhes: r.detalhes ?? null
  });
}
