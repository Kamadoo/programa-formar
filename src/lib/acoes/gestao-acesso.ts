'use server';

/**
 * Primeiro acesso da gestão (mesma sequência do portal e do Oficineiro+):
 * CPF ou CNPJ (o que foi cadastrado) → código no e-mail → aplicativo autenticador → senha → pronto.
 * O usuário de login já existe desde o cadastro; o documento só serve para ativar a conta.
 * A resposta do pedido de código é sempre a mesma, para não revelar quem está cadastrado.
 */
import { randomInt } from 'node:crypto';
import { redirect } from 'next/navigation';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { falha, sucesso, type Resultado } from '@/lib/acao';
import { auditar } from '@/lib/auditoria';
import { decifrarOuNulo, hashDocumento, sha256 } from '@/lib/cripto';
import { enfileirarCodigo } from '@/lib/email';
import { documentoValido, normalizarDocumento, somenteDigitos, tipoDocumento } from '@/lib/dominio/regras';
import { gerarHashSenha, problemaSenha } from '@/lib/auth/senha';
import { bloqueadoAte, limparFalhas, registrarFalha, tempoMinimo } from '@/lib/auth/limite';
import {
  concluirSegundaEtapa,
  encerrarSessao,
  encerrarTodasSessoes,
  gestorParcial,
  iniciarSessao,
  marcarSegundaEtapaOk,
  segundaEtapaOkNestaSessao
} from '@/lib/auth/sessao';
import { conferirCodigo, gerarCodigosRecuperacao, normalizarRecuperacao } from '@/lib/auth/totp';

const MSG_BLOQUEIO = 'Muitas tentativas sem sucesso. Aguarde alguns minutos e tente de novo.';
const MSG_DOCUMENTO = 'Digite o CPF (11 números) ou o CNPJ (14 caracteres) completo.';
const CODIGO_MIN = 10;
const MSG_CODIGO_ENVIADO =
  'Se os dados estiverem cadastrados na gestão do Programa Formar, você receberá um código no e-mail da sua conta em instantes. Ele vale por 10 minutos.';

export type ResultadoCodigosGestor = (NonNullable<Resultado> & { codigos?: string[] }) | null;

const hashCodigo = (gestorId: string, codigo: string) => sha256(`gestor:${gestorId}:${codigo}`);
const lerDocumento = (form: FormData) => normalizarDocumento(String(form.get('documento') ?? '').slice(0, 24));
const testeVencido = (ate: Date | null) => Boolean(ate && ate.getTime() < Date.now());

/** Conta ativa com esse CPF/CNPJ (o tipo sai do tamanho do que foi digitado). */
async function contaPorDocumento(documento: string) {
  const tipo = tipoDocumento(documento);
  if (!tipo || !documentoValido(tipo, documento)) return null;
  const d = await db();
  const [g] = await d
    .select()
    .from(s.gestor)
    .where(and(eq(s.gestor.documentoHash, hashDocumento(tipo, documento)), eq(s.gestor.ativo, true)))
    .limit(1);
  return g ?? null;
}

async function enviarCodigo(g: { id: string; nome: string; email: string }) {
  const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const d = await db();
  await d.transaction(async tx => {
    await tx
      .update(s.tokenGestor)
      .set({ usadoEm: new Date() })
      .where(and(eq(s.tokenGestor.gestorId, g.id), eq(s.tokenGestor.tipo, 'codigo'), isNull(s.tokenGestor.usadoEm)));
    await tx.insert(s.tokenGestor).values({
      tokenHash: hashCodigo(g.id, codigo),
      gestorId: g.id,
      tipo: 'codigo',
      expiraEm: new Date(Date.now() + CODIGO_MIN * 60_000)
    });
    await enfileirarCodigo(g.email, g.nome, codigo, 'primeiro_acesso', CODIGO_MIN, tx, 'gestao');
    await auditar(
      {
        atorTipo: 'gestor',
        atorId: g.id,
        acao: 'solicitar_codigo',
        entidade: 'gestor',
        entidadeId: g.id,
        detalhes: { finalidade: 'primeiro_acesso' }
      },
      tx
    );
  });
}

async function consumirCodigo(gestorId: string, codigo: string): Promise<boolean> {
  if (codigo.length !== 6) return false;
  const d = await db();
  const usados = await d
    .update(s.tokenGestor)
    .set({ usadoEm: new Date() })
    .where(
      and(
        eq(s.tokenGestor.tokenHash, hashCodigo(gestorId, codigo)),
        eq(s.tokenGestor.tipo, 'codigo'),
        isNull(s.tokenGestor.usadoEm),
        gt(s.tokenGestor.expiraEm, new Date())
      )
    )
    .returning({ h: s.tokenGestor.tokenHash });
  return usados.length > 0;
}

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

/** Sessão do primeiro acesso: passou pelo código do e-mail e ainda não criou a senha. */
async function emPrimeiroAcesso() {
  const g = await gestorParcial();
  if (!g) redirect('/gestao/primeiro-acesso');
  if (g.cadastroConcluido) redirect('/gestao/verificacao');
  return g;
}

/* ----------------------------- passo 1 ------------------------------ */

export async function pedirCodigoPrimeiroAcessoGestor(_: Resultado, form: FormData): Promise<Resultado> {
  const documento = lerDocumento(form);
  const tipo = tipoDocumento(documento);
  if (!tipo) return falha(MSG_DOCUMENTO, { documento: MSG_DOCUMENTO });
  if (!documentoValido(tipo, documento)) {
    const m = tipo === 'cpf' ? 'CPF inválido. Confira os números.' : 'CNPJ inválido. Confira os caracteres.';
    return falha(m, { documento: m });
  }
  const chave = 'pedido-g:' + hashDocumento(tipo, documento);
  if (await bloqueadoAte(chave)) return falha(MSG_BLOQUEIO);
  // Conta como "falha" para limitar quantos e-mails podem ser pedidos em sequência.
  await registrarFalha(chave);
  await tempoMinimo(800, async () => {
    const g = await contaPorDocumento(documento);
    // Quem já concluiu o cadastro usa o login normal.
    if (!g || g.primeiroAcessoEm || testeVencido(g.testeAte)) return;
    await enviarCodigo(g);
  });
  return sucesso(MSG_CODIGO_ENVIADO);
}

export async function confirmarPrimeiroAcessoGestor(_: Resultado, form: FormData): Promise<Resultado> {
  const documento = lerDocumento(form);
  const codigo = somenteDigitos(String(form.get('codigo') ?? '').slice(0, 12));
  const tipo = tipoDocumento(documento);
  if (!tipo || codigo.length !== 6) return falha('Digite o código de 6 números que chegou no seu e-mail.');
  const g = await contaPorDocumento(documento);
  const chave = 'codigo-g:' + (g?.id ?? hashDocumento(tipo, documento));
  if (await bloqueadoAte(chave)) return falha(MSG_BLOQUEIO);
  const ok = g && !g.primeiroAcessoEm ? await consumirCodigo(g.id, codigo) : false;
  if (!ok || !g) {
    await registrarFalha(chave);
    return falha('Código incorreto ou vencido. Confira o e-mail ou peça um novo código.');
  }
  await limparFalhas(chave);
  // Recomeça o cadastro do zero (pode ter ficado pela metade em outra tentativa).
  const d = await db();
  await d
    .update(s.gestor)
    .set({ totpSegredo: null, totpPendente: null, totpAtivadoEm: null, totpUltimoPasso: null })
    .where(eq(s.gestor.id, g.id));
  await d.delete(s.codigoRecuperacao).where(eq(s.codigoRecuperacao.gestorId, g.id));
  await encerrarTodasSessoes('gestor', g.id);
  await encerrarSessao('gestor');
  await iniciarSessao('gestor', g.id, 'senha');
  await auditar({
    atorTipo: 'gestor',
    atorId: g.id,
    acao: 'primeiro_acesso_codigo_ok',
    entidade: 'gestor',
    entidadeId: g.id
  });
  redirect('/gestao/primeiro-acesso/autenticador');
}

/* ----------------------------- passo 2 ------------------------------ */

export async function ativarAutenticadorPrimeiroAcesso(
  _: ResultadoCodigosGestor,
  form: FormData
): Promise<ResultadoCodigosGestor> {
  const g = await emPrimeiroAcesso();
  if (g.totpAtivo) redirect('/gestao/primeiro-acesso/senha');
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
  await marcarSegundaEtapaOk('gestor');
  await auditar({ atorTipo: 'gestor', atorId: g.id, acao: 'ativar_2fa', entidade: 'gestor', entidadeId: g.id });
  return { ok: true, mensagem: 'Aplicativo autenticador ativado.', t: Date.now(), codigos };
}

/** Depois de guardar os códigos de recuperação: segue para criar a senha. */
export async function concluirAutenticadorPrimeiroAcesso() {
  const g = await emPrimeiroAcesso();
  redirect(g.totpAtivo ? '/gestao/primeiro-acesso/senha' : '/gestao/primeiro-acesso/autenticador');
}

export async function cancelarPrimeiroAcessoGestor() {
  await encerrarSessao('gestor');
  redirect('/gestao/entrar');
}

/* ----------------------------- passo 3 ------------------------------ */

export async function definirSenhaPrimeiroAcessoGestor(_: Resultado, form: FormData): Promise<Resultado> {
  const g = await emPrimeiroAcesso();
  if (!g.totpAtivo || !(await segundaEtapaOkNestaSessao('gestor'))) redirect('/gestao/primeiro-acesso/autenticador');
  const senha = String(form.get('senha') ?? '');
  const problema = problemaSenha(senha);
  if (problema) return falha(problema, { senha: problema });
  if (senha !== String(form.get('confirmacao') ?? ''))
    return falha('As senhas não são iguais.', { confirmacao: 'As senhas não são iguais.' });
  const agora = new Date();
  const d = await db();
  await d
    .update(s.gestor)
    .set({
      senhaHash: await gerarHashSenha(senha),
      senhaAlteradaEm: agora,
      primeiroAcessoEm: agora,
      ultimoLoginEm: agora
    })
    .where(eq(s.gestor.id, g.id));
  await auditar({
    atorTipo: 'gestor',
    atorId: g.id,
    acao: 'primeiro_acesso_concluido',
    entidade: 'gestor',
    entidadeId: g.id
  });
  await concluirSegundaEtapa(g.id, 'gestor');
  redirect('/gestao/primeiro-acesso/pronto');
}
