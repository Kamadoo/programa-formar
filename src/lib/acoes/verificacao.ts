'use server';

import { redirect } from 'next/navigation';
import { and, eq, isNull } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { falha, type Resultado } from '@/lib/acao';
import { auditar } from '@/lib/auditoria';
import { decifrarOuNulo, sha256 } from '@/lib/cripto';
import { bloqueadoAte, limparFalhas, registrarFalha } from '@/lib/auth/limite';
import {
  concluirSegundaEtapa,
  encerrarSessao,
  exigirGestor,
  gestorParcial,
  marcarSegundaEtapaOk,
  segundaEtapaOkNestaSessao
} from '@/lib/auth/sessao';
import { conferirCodigo, gerarCodigosRecuperacao, normalizarRecuperacao } from '@/lib/auth/totp';

const MSG_BLOQUEIO = 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';

export type ResultadoAtivacao = (NonNullable<Resultado> & { codigos?: string[] }) | null;

async function salvarCodigosRecuperacao(gestorId: string) {
  const codigos = gerarCodigosRecuperacao();
  const d = await db();
  await d.transaction(async tx => {
    await tx.delete(s.codigoRecuperacao).where(eq(s.codigoRecuperacao.gestorId, gestorId));
    await tx
      .insert(s.codigoRecuperacao)
      .values(codigos.map(c => ({ gestorId, hash: sha256(normalizarRecuperacao(c)) })));
  });
  return codigos;
}

/** Primeira ativação: confere o código do aplicativo e mostra os códigos de recuperação. */
// Segredo do aplicativo que não abre mais (ex.: chave trocada). Não conta como tentativa errada.
const MSG_SEGREDO_ILEGIVEL =
  'Não foi possível conferir o código do aplicativo nesta conta: a verificação em duas etapas precisa ser configurada de novo. Entre com um dos códigos de recuperação ou peça ao administrador para redefinir as duas etapas.';

export async function ativarVerificacao(_: ResultadoAtivacao, form: FormData): Promise<ResultadoAtivacao> {
  const g = await gestorParcial();
  if (!g) redirect('/gestao/entrar');
  if (g.totpAtivo) redirect('/gestao/verificacao');
  const chave = 'mfa:' + g.id;
  if (await bloqueadoAte(chave)) return falha(MSG_BLOQUEIO);

  const d = await db();
  const [row] = await d
    .select({ pendente: s.gestor.totpPendente })
    .from(s.gestor)
    .where(eq(s.gestor.id, g.id))
    .limit(1);
  if (!row?.pendente) return falha('Recarregue a página e leia o QR code de novo.');
  const segredo = decifrarOuNulo(row.pendente, 'totp pendente gestor');
  if (!segredo) {
    await d.update(s.gestor).set({ totpPendente: null }).where(eq(s.gestor.id, g.id));
    return falha('Recarregue a página e leia o novo QR code.');
  }
  const passo = conferirCodigo(segredo, String(form.get('codigo') ?? ''), null);
  if (passo === null) {
    await registrarFalha(chave);
    return falha('Código incorreto. Confira se o relógio do celular está certo e use o código atual do aplicativo.');
  }
  await limparFalhas(chave);
  await d
    .update(s.gestor)
    .set({ totpSegredo: row.pendente, totpPendente: null, totpAtivadoEm: new Date(), totpUltimoPasso: passo })
    .where(eq(s.gestor.id, g.id));
  const codigos = await salvarCodigosRecuperacao(g.id);
  await auditar({ atorTipo: 'gestor', atorId: g.id, acao: 'ativar_2fa', entidade: 'gestor', entidadeId: g.id });
  // A sessão continua parcial até a pessoa confirmar que guardou os códigos (concluirAtivacao).
  await marcarSegundaEtapaOk();
  return { ok: true, mensagem: 'Verificação em duas etapas ativada.', t: Date.now(), codigos };
}

/** Depois de ver os códigos de recuperação: libera o acesso. Só vale na mesma sessão que ativou. */
export async function concluirAtivacao() {
  const g = await gestorParcial();
  if (!g) redirect('/gestao/entrar');
  if (!g.totpAtivo || !(await segundaEtapaOkNestaSessao())) redirect('/gestao/verificacao');
  await d_login(g.id);
  await concluirSegundaEtapa(g.id);
  redirect('/gestao');
}

async function d_login(gestorId: string) {
  const d = await db();
  await d.update(s.gestor).set({ ultimoLoginEm: new Date() }).where(eq(s.gestor.id, gestorId));
  await auditar({
    atorTipo: 'gestor',
    atorId: gestorId,
    acao: 'login',
    entidade: 'sessao',
    detalhes: { segundaEtapa: 'ativacao' }
  });
}

/** Login: segunda etapa com o código do aplicativo ou um código de recuperação. */
export async function verificarSegundaEtapa(_: Resultado, form: FormData): Promise<Resultado> {
  const g = await gestorParcial();
  if (!g) redirect('/gestao/entrar');
  if (!g.totpAtivo) redirect('/gestao/verificacao');
  if (await segundaEtapaOkNestaSessao()) await concluirAtivacao();
  const chave = 'mfa:' + g.id;
  if (await bloqueadoAte(chave)) return falha(MSG_BLOQUEIO);

  const entrada = String(form.get('codigo') ?? '').slice(0, 20);
  const d = await db();
  const [row] = await d.select().from(s.gestor).where(eq(s.gestor.id, g.id)).limit(1);
  let ok = false;
  let usouRecuperacao = false;

  if (/^\s*\d{3}\s?\d{3}\s*$/.test(entrada)) {
    const segredo = decifrarOuNulo(row.totpSegredo!, 'totp gestor');
    if (!segredo) return falha(MSG_SEGREDO_ILEGIVEL);
    const passo = conferirCodigo(segredo, entrada, row.totpUltimoPasso);
    if (passo !== null) {
      ok = true;
      await d.update(s.gestor).set({ totpUltimoPasso: passo }).where(eq(s.gestor.id, g.id));
    }
  } else {
    const hash = sha256(normalizarRecuperacao(entrada));
    const usado = await d
      .update(s.codigoRecuperacao)
      .set({ usadoEm: new Date() })
      .where(
        and(
          eq(s.codigoRecuperacao.gestorId, g.id),
          eq(s.codigoRecuperacao.hash, hash),
          isNull(s.codigoRecuperacao.usadoEm)
        )
      )
      .returning({ id: s.codigoRecuperacao.id });
    ok = usado.length > 0;
    usouRecuperacao = ok;
  }

  if (!ok) {
    await registrarFalha(chave);
    await auditar({ atorTipo: 'gestor', atorId: g.id, acao: 'falha_2fa', entidade: 'sessao' });
    return falha('Código incorreto ou já usado.');
  }
  await limparFalhas(chave);
  await d.update(s.gestor).set({ ultimoLoginEm: new Date() }).where(eq(s.gestor.id, g.id));
  await auditar({
    atorTipo: 'gestor',
    atorId: g.id,
    acao: 'login',
    entidade: 'sessao',
    detalhes: usouRecuperacao ? { segundaEtapa: 'codigo_recuperacao' } : { segundaEtapa: 'aplicativo' }
  });
  await concluirSegundaEtapa(g.id);
  redirect(usouRecuperacao ? '/gestao/conta?recuperacao=1' : '/gestao');
}

export async function cancelarVerificacao() {
  await encerrarSessao('gestor');
  redirect('/gestao/entrar');
}

/** Minha conta: gera novos códigos de recuperação (pede o código atual do aplicativo). */
export async function novosCodigosRecuperacao(_: ResultadoAtivacao, form: FormData): Promise<ResultadoAtivacao> {
  const g = await exigirGestor();
  const chave = 'mfa:' + g.id;
  if (await bloqueadoAte(chave)) return falha(MSG_BLOQUEIO);
  const d = await db();
  const [row] = await d.select().from(s.gestor).where(eq(s.gestor.id, g.id)).limit(1);
  const segredo = row.totpSegredo ? decifrarOuNulo(row.totpSegredo, 'totp gestor') : null;
  if (row.totpSegredo && !segredo) return falha(MSG_SEGREDO_ILEGIVEL);
  const passo = segredo ? conferirCodigo(segredo, String(form.get('codigo') ?? ''), row.totpUltimoPasso) : null;
  if (passo === null) {
    await registrarFalha(chave);
    return falha('Código do aplicativo incorreto.');
  }
  await limparFalhas(chave);
  await d.update(s.gestor).set({ totpUltimoPasso: passo }).where(eq(s.gestor.id, g.id));
  const codigos = await salvarCodigosRecuperacao(g.id);
  await auditar({
    atorTipo: 'gestor',
    atorId: g.id,
    acao: 'novos_codigos_recuperacao',
    entidade: 'gestor',
    entidadeId: g.id
  });
  return { ok: true, mensagem: 'Novos códigos gerados. Os anteriores deixaram de valer.', t: Date.now(), codigos };
}
