'use server';

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema as s } from '@/db';
import { falha, type Resultado } from '@/lib/acao';
import { auditar } from '@/lib/auditoria';
import { conferirSenha } from '@/lib/auth/senha';
import { bloqueadoAte, limparFalhas, registrarFalha, tempoMinimo } from '@/lib/auth/limite';
import { encerrarSessao, iniciarSessao } from '@/lib/auth/sessao';
import { usuarioValido } from '@/lib/dominio/regras';

const MSG_BLOQUEIO = 'Muitas tentativas sem sucesso. Aguarde alguns minutos e tente de novo.';

/* ------------------------------------------------------------------ */
/* Gestão                                                               */
/* ------------------------------------------------------------------ */

const loginGestor = z.object({
  usuario: z.string().trim().toLowerCase().refine(usuarioValido),
  senha: z.string().min(1).max(200)
});

export async function entrarGestao(_: Resultado, form: FormData): Promise<Resultado> {
  const p = loginGestor.safeParse({ usuario: form.get('usuario'), senha: form.get('senha') });
  if (!p.success) return falha('Usuário ou senha não conferem.');
  const chave = 'gestao:' + p.data.usuario;
  if (await bloqueadoAte(chave)) return falha(MSG_BLOQUEIO);

  const g = await tempoMinimo(700, async () => {
    const d = await db();
    const [row] = await d.select().from(s.gestor).where(eq(s.gestor.usuario, p.data.usuario)).limit(1);
    const ok = await conferirSenha(row?.ativo ? row.senhaHash : null, p.data.senha);
    return ok ? row : null;
  });
  if (!g) {
    await registrarFalha(chave);
    return falha('Usuário ou senha não conferem.');
  }
  await limparFalhas(chave);
  // Conta de demonstração: entra direto (sem a segunda etapa), só enquanto estiver no prazo.
  if (g.testeAte) {
    if (g.testeAte.getTime() < Date.now()) return falha('Esta conta de teste venceu.');
    await iniciarSessao('gestor', g.id, 'completa', form.get('lembrar') === 'sim');
    await auditar({ atorTipo: 'gestor', atorId: g.id, acao: 'login_conta_teste', entidade: 'sessao' });
    redirect('/gestao');
  }
  // Senha correta = só a primeira etapa. O acesso só libera depois do código do aplicativo.
  await iniciarSessao('gestor', g.id, 'senha', form.get('lembrar') === 'sim');
  await auditar({ atorTipo: 'gestor', atorId: g.id, acao: 'senha_ok', entidade: 'sessao' });
  redirect('/gestao/verificacao');
}

export async function sairGestao() {
  await encerrarSessao('gestor');
  redirect('/gestao/entrar');
}
