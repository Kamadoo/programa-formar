'use server';

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { falha, sucesso, type Resultado } from '@/lib/acao';
import { auditar } from '@/lib/auditoria';
import { sha256 } from '@/lib/cripto';
import { bloqueadoAte, limparFalhas, registrarFalha } from '@/lib/auth/limite';
import { conferirSenha, gerarHashSenha, problemaSenha } from '@/lib/auth/senha';
import { encerrarSessao, encerrarTodasSessoes, exigirGestor, exigirServidor, iniciarSessao } from '@/lib/auth/sessao';
import { validarTokenGestor } from '@/lib/auth/tokens';
import { avisarSenhaAlterada } from '@/lib/email';

type DadosTroca = { atual: string; nova: string; confirmacao: string };

function lerTroca(form: FormData): DadosTroca {
  return {
    atual: String(form.get('atual') ?? '').slice(0, 200),
    nova: String(form.get('nova') ?? ''),
    confirmacao: String(form.get('confirmacao') ?? '')
  };
}

function validarNova(t: DadosTroca): Resultado {
  const p = problemaSenha(t.nova);
  if (p) return falha(p, { nova: p });
  if (t.nova !== t.confirmacao) return falha('As senhas não são iguais.', { confirmacao: 'As senhas não são iguais.' });
  if (t.nova === t.atual)
    return falha('A nova senha precisa ser diferente da atual.', { nova: 'Use uma senha diferente da atual.' });
  return null;
}

/** Troca de senha da gestão: pede a senha atual; encerra as outras sessões. */
export async function trocarSenhaGestor(_: Resultado, form: FormData): Promise<Resultado> {
  const g = await exigirGestor();
  const t = lerTroca(form);
  const erro = validarNova(t);
  if (erro) return erro;
  const chave = 'troca:' + g.id;
  if (await bloqueadoAte(chave)) return falha('Muitas tentativas. Aguarde alguns minutos.');
  const d = await db();
  const [row] = await d.select({ hash: s.gestor.senhaHash }).from(s.gestor).where(eq(s.gestor.id, g.id)).limit(1);
  if (!(await conferirSenha(row?.hash, t.atual))) {
    await registrarFalha(chave);
    return falha('Senha atual incorreta.', { atual: 'Senha atual incorreta.' });
  }
  await limparFalhas(chave);
  await d
    .update(s.gestor)
    .set({ senhaHash: await gerarHashSenha(t.nova), senhaAlteradaEm: new Date() })
    .where(eq(s.gestor.id, g.id));
  await encerrarTodasSessoes('gestor', g.id);
  await iniciarSessao('gestor', g.id, 'completa');
  await auditar({ atorTipo: 'gestor', atorId: g.id, acao: 'trocar_senha', entidade: 'gestor', entidadeId: g.id });
  await avisarSenhaAlterada(g.email, g.nome, 'gestao');
  return sucesso('Senha alterada. As sessões em outros aparelhos foram encerradas.');
}

export async function trocarSenhaServidor(_: Resultado, form: FormData): Promise<Resultado> {
  const sv = await exigirServidor();
  const t = lerTroca(form);
  const erro = validarNova(t);
  if (erro) return erro;
  const chave = 'troca:' + sv.id;
  if (await bloqueadoAte(chave)) return falha('Muitas tentativas. Aguarde alguns minutos.');
  const d = await db();
  const [row] = await d
    .select({ hash: s.usuarioPortal.senhaHash })
    .from(s.usuarioPortal)
    .where(eq(s.usuarioPortal.servidorId, sv.id))
    .limit(1);
  if (!(await conferirSenha(row?.hash, t.atual))) {
    await registrarFalha(chave);
    return falha('Senha atual incorreta.', { atual: 'Senha atual incorreta.' });
  }
  await limparFalhas(chave);
  await d
    .update(s.usuarioPortal)
    .set({ senhaHash: await gerarHashSenha(t.nova), senhaAlteradaEm: new Date() })
    .where(eq(s.usuarioPortal.servidorId, sv.id));
  await encerrarTodasSessoes('servidor', sv.id);
  await iniciarSessao('servidor', sv.id);
  await auditar({ atorTipo: 'servidor', atorId: sv.id, acao: 'trocar_senha', entidade: 'usuario_portal' });
  const [contato] = await d
    .select({ email: s.servidor.emailInstitucional })
    .from(s.servidor)
    .where(eq(s.servidor.id, sv.id))
    .limit(1);
  if (contato) await avisarSenhaAlterada(contato.email, sv.nome, 'portal');
  return sucesso('Senha alterada. As sessões em outros aparelhos foram encerradas.');
}

/** Convite/redefinição da gestão: define a senha pelo link de uso único. */
export async function definirSenhaGestor(_: Resultado, form: FormData): Promise<Resultado> {
  const token = String(form.get('token') ?? '');
  const nova = String(form.get('senha') ?? '');
  const confirmacao = String(form.get('confirmacao') ?? '');
  const p = problemaSenha(nova);
  if (p) return falha(p, { senha: p });
  if (nova !== confirmacao) return falha('As senhas não são iguais.', { confirmacao: 'As senhas não são iguais.' });
  const t = await validarTokenGestor(token);
  if (!t) return falha('Este link expirou ou já foi usado. Peça um novo ao administrador.');
  const hash = await gerarHashSenha(nova);
  const d = await db();
  await d.transaction(async tx => {
    await tx
      .update(s.tokenGestor)
      .set({ usadoEm: new Date() })
      .where(eq(s.tokenGestor.tokenHash, sha256(token)));
    await tx.update(s.gestor).set({ senhaHash: hash, senhaAlteradaEm: new Date() }).where(eq(s.gestor.id, t.gestorId));
  });
  await auditar({
    atorTipo: 'gestor',
    atorId: t.gestorId,
    acao: 'definir_senha',
    entidade: 'gestor',
    entidadeId: t.gestorId
  });
  await encerrarTodasSessoes('gestor', t.gestorId);
  await encerrarSessao('gestor');
  redirect('/gestao/entrar?senha=ok');
}
