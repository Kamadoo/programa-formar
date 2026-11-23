'use server';

/**
 * Acesso do servidor ao portal:
 * - Primeiro acesso: CPF → código no e-mail institucional → aplicativo autenticador → senha → usuário gerado automaticamente.
 * - Login: usuário + senha + código do aplicativo (ou um código de recuperação).
 * - O CPF só é usado para ativar a conta e para lembrar o usuário; nunca para entrar.
 * As respostas dos pedidos de código são sempre iguais, para não revelar quem está cadastrado.
 */
import { randomInt } from 'node:crypto';
import { redirect } from 'next/navigation';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { falha, sucesso, type Resultado } from '@/lib/acao';
import { auditar } from '@/lib/auditoria';
import { decifrarOuNulo, hashCpf, sha256 } from '@/lib/cripto';
import { avisarSenhaAlterada, enfileirarCodigo, enfileirarEmail, link } from '@/lib/email';
import { primeiroNome, somenteDigitos, usuarioCandidato, usuarioValido } from '@/lib/dominio/regras';
import { conferirSenha, gerarHashSenha, problemaSenha } from '@/lib/auth/senha';
import { bloqueadoAte, limparFalhas, registrarFalha, tempoMinimo } from '@/lib/auth/limite';
import {
  concluirSegundaEtapa,
  encerrarSessao,
  encerrarTodasSessoes,
  exigirServidor,
  iniciarSessao,
  marcarSegundaEtapaOk,
  segundaEtapaOkNestaSessao,
  servidorParcial
} from '@/lib/auth/sessao';
import { conferirCodigo, gerarCodigosRecuperacao, normalizarRecuperacao } from '@/lib/auth/totp';

const MSG_BLOQUEIO = 'Muitas tentativas sem sucesso. Aguarde alguns minutos e tente de novo.';
const CODIGO_MIN = 10;
const MSG_CODIGO_ENVIADO =
  'Se os dados estiverem cadastrados no Programa Formar, você receberá um código no seu e-mail institucional em instantes. Ele vale por 10 minutos.';

type Finalidade = 'primeiro_acesso' | 'redefinir_senha';
export type ResultadoCodigos = (NonNullable<Resultado> & { codigos?: string[] }) | null;

/* ----------------------------- apoio ------------------------------ */

const hashCodigo = (servidorId: string, codigo: string) => sha256(`${servidorId}:${codigo}`);

async function contaPorCpf(cpf: string) {
  const d = await db();
  const [r] = await d
    .select({ sv: s.servidor, conta: s.usuarioPortal })
    .from(s.servidor)
    .innerJoin(s.usuarioPortal, eq(s.usuarioPortal.servidorId, s.servidor.id))
    .where(and(eq(s.servidor.cpfHash, hashCpf(cpf)), eq(s.servidor.ativo, true)))
    .limit(1);
  return r ?? null;
}

async function contaPorUsuario(usuario: string) {
  const d = await db();
  const [r] = await d
    .select({ sv: s.servidor, conta: s.usuarioPortal })
    .from(s.usuarioPortal)
    .innerJoin(s.servidor, eq(s.servidor.id, s.usuarioPortal.servidorId))
    .where(and(eq(s.usuarioPortal.usuario, usuario), eq(s.servidor.ativo, true)))
    .limit(1);
  return r ?? null;
}

const lerUsuario = (form: FormData) =>
  String(form.get('usuario') ?? '')
    .trim()
    .toLowerCase()
    .slice(0, 40);
const lerCpf = (form: FormData) => somenteDigitos(String(form.get('cpf') ?? '').slice(0, 20));
const lerCodigo = (form: FormData) => somenteDigitos(String(form.get('codigo') ?? '').slice(0, 12));
const testeVencido = (ate: Date | null) => Boolean(ate && ate.getTime() < Date.now());

/** Gera um código de 6 dígitos (10 min), invalida os anteriores da mesma finalidade e envia por e-mail. */
async function enviarCodigo(
  sv: { id: string; nomeCompleto: string; emailInstitucional: string },
  finalidade: Finalidade
) {
  const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const d = await db();
  await d.transaction(async tx => {
    await tx
      .update(s.tokenAcesso)
      .set({ usadoEm: new Date() })
      .where(
        and(
          eq(s.tokenAcesso.servidorId, sv.id),
          eq(s.tokenAcesso.finalidade, finalidade),
          isNull(s.tokenAcesso.usadoEm)
        )
      );
    await tx.insert(s.tokenAcesso).values({
      tokenHash: hashCodigo(sv.id, codigo),
      servidorId: sv.id,
      finalidade,
      expiraEm: new Date(Date.now() + CODIGO_MIN * 60_000)
    });
    await enfileirarCodigo(sv.emailInstitucional, sv.nomeCompleto, codigo, finalidade, CODIGO_MIN, tx);
    await auditar(
      {
        atorTipo: 'servidor',
        atorId: sv.id,
        acao: 'solicitar_codigo',
        entidade: 'usuario_portal',
        detalhes: { finalidade }
      },
      tx
    );
  });
}

/** Confere e consome o código do e-mail. Erros contam no bloqueio por servidor. */
async function consumirCodigo(servidorId: string, codigo: string, finalidade: Finalidade): Promise<boolean> {
  if (codigo.length !== 6) return false;
  const d = await db();
  const usados = await d
    .update(s.tokenAcesso)
    .set({ usadoEm: new Date() })
    .where(
      and(
        eq(s.tokenAcesso.tokenHash, hashCodigo(servidorId, codigo)),
        eq(s.tokenAcesso.finalidade, finalidade),
        isNull(s.tokenAcesso.usadoEm),
        gt(s.tokenAcesso.expiraEm, new Date())
      )
    )
    .returning({ h: s.tokenAcesso.tokenHash });
  return usados.length > 0;
}

/** Usuário automático: maria.silva, maria.silva2… (único). */
async function garantirUsuario(servidorId: string, nomeCompleto: string, atual: string | null): Promise<string> {
  if (atual) return atual;
  const d = await db();
  for (let n = 1; n < 1000; n++) {
    const candidato = usuarioCandidato(nomeCompleto, n);
    const [ja] = await d
      .select({ id: s.usuarioPortal.servidorId })
      .from(s.usuarioPortal)
      .where(eq(s.usuarioPortal.usuario, candidato))
      .limit(1);
    if (ja) continue;
    try {
      await d.update(s.usuarioPortal).set({ usuario: candidato }).where(eq(s.usuarioPortal.servidorId, servidorId));
      return candidato;
    } catch {
      // Outro cadastro pegou o mesmo nome ao mesmo tempo: tenta o próximo.
    }
  }
  throw new Error('Não foi possível gerar o usuário.');
}

async function salvarCodigosRecuperacao(servidorId: string) {
  const codigos = gerarCodigosRecuperacao();
  const d = await db();
  await d.transaction(async tx => {
    await tx.delete(s.codigoRecuperacaoServidor).where(eq(s.codigoRecuperacaoServidor.servidorId, servidorId));
    await tx
      .insert(s.codigoRecuperacaoServidor)
      .values(codigos.map(c => ({ servidorId, hash: sha256(normalizarRecuperacao(c)) })));
  });
  return codigos;
}

/* -------------------------- primeiro acesso -------------------------- */

// Segredo do aplicativo que não abre mais (ex.: chave trocada). Não conta como tentativa errada.
const MSG_SEGREDO_ILEGIVEL_SV =
  'Não foi possível conferir o código do aplicativo nesta conta: o aplicativo autenticador precisa ser configurado de novo. Entre com um dos códigos de recuperação ou peça à administração do Programa Formar para zerar seu acesso.';

export async function pedirCodigoPrimeiroAcesso(_: Resultado, form: FormData): Promise<Resultado> {
  const cpf = lerCpf(form);
  if (cpf.length !== 11)
    return falha('Digite o CPF completo (11 números).', { cpf: 'Digite o CPF completo (11 números).' });
  const chave = 'pedido:' + hashCpf(cpf);
  if (await bloqueadoAte(chave)) return falha(MSG_BLOQUEIO);
  // Conta como "falha" para limitar quantos e-mails podem ser pedidos em sequência.
  await registrarFalha(chave);
  await tempoMinimo(800, async () => {
    const r = await contaPorCpf(cpf);
    // Só quem foi vinculado a alguma formação tem conta; quem já concluiu o cadastro usa o login normal.
    if (!r || r.conta.primeiroAcessoEm || testeVencido(r.sv.testeAte)) return;
    await enviarCodigo(r.sv, 'primeiro_acesso');
  });
  return sucesso(MSG_CODIGO_ENVIADO);
}

export async function confirmarPrimeiroAcesso(_: Resultado, form: FormData): Promise<Resultado> {
  const cpf = lerCpf(form);
  const codigo = lerCodigo(form);
  if (cpf.length !== 11 || codigo.length !== 6) return falha('Digite o código de 6 números que chegou no seu e-mail.');
  const r = await contaPorCpf(cpf);
  const chave = 'codigo:' + (r?.sv.id ?? hashCpf(cpf));
  if (await bloqueadoAte(chave)) return falha(MSG_BLOQUEIO);
  const ok = r && !r.conta.primeiroAcessoEm ? await consumirCodigo(r.sv.id, codigo, 'primeiro_acesso') : false;
  if (!ok || !r) {
    await registrarFalha(chave);
    return falha('Código incorreto ou vencido. Confira o e-mail ou peça um novo código.');
  }
  await limparFalhas(chave);
  // Recomeça o cadastro do zero (pode ter ficado pela metade em outra tentativa).
  const d = await db();
  await d
    .update(s.usuarioPortal)
    .set({ senhaHash: null, totpSegredo: null, totpPendente: null, totpAtivadoEm: null, totpUltimoPasso: null })
    .where(eq(s.usuarioPortal.servidorId, r.sv.id));
  await d.delete(s.codigoRecuperacaoServidor).where(eq(s.codigoRecuperacaoServidor.servidorId, r.sv.id));
  await garantirUsuario(r.sv.id, r.sv.nomeCompleto, r.conta.usuario);
  await encerrarSessao('servidor');
  await iniciarSessao('servidor', r.sv.id, 'senha');
  await auditar({
    atorTipo: 'servidor',
    atorId: r.sv.id,
    acao: 'primeiro_acesso_codigo_ok',
    entidade: 'usuario_portal'
  });
  redirect('/primeiro-acesso/autenticador');
}

/** Lê o código do aplicativo no cadastro e mostra os códigos de recuperação. */
export async function ativarAutenticadorServidor(_: ResultadoCodigos, form: FormData): Promise<ResultadoCodigos> {
  const p = await servidorParcial();
  if (!p) redirect('/primeiro-acesso');
  if (p.cadastroConcluido || p.totpAtivo) redirect('/primeiro-acesso/senha');
  const chave = 'mfa-sv:' + p.id;
  if (await bloqueadoAte(chave)) return falha(MSG_BLOQUEIO);
  const d = await db();
  const [c] = await d
    .select({ pendente: s.usuarioPortal.totpPendente })
    .from(s.usuarioPortal)
    .where(eq(s.usuarioPortal.servidorId, p.id))
    .limit(1);
  if (!c?.pendente) return falha('Recarregue a página e leia o QR code de novo.');
  const pendente = decifrarOuNulo(c.pendente, 'totp pendente servidor');
  if (!pendente) {
    await d.update(s.usuarioPortal).set({ totpPendente: null }).where(eq(s.usuarioPortal.servidorId, p.id));
    return falha('Recarregue a página e leia o novo QR code.');
  }
  const passo = conferirCodigo(pendente, String(form.get('codigo') ?? ''), null);
  if (passo === null) {
    await registrarFalha(chave);
    return falha('Código incorreto. Confira se o relógio do celular está certo e use o código atual do aplicativo.');
  }
  await limparFalhas(chave);
  await d
    .update(s.usuarioPortal)
    .set({ totpSegredo: c.pendente, totpPendente: null, totpAtivadoEm: new Date(), totpUltimoPasso: passo })
    .where(eq(s.usuarioPortal.servidorId, p.id));
  const codigos = await salvarCodigosRecuperacao(p.id);
  await marcarSegundaEtapaOk('servidor');
  await auditar({ atorTipo: 'servidor', atorId: p.id, acao: 'ativar_2fa', entidade: 'usuario_portal' });
  return { ok: true, mensagem: 'Aplicativo autenticador ativado.', t: Date.now(), codigos };
}

/** Depois de guardar os códigos de recuperação: segue para criar a senha. */
export async function concluirAutenticadorServidor() {
  const p = await servidorParcial();
  if (!p) redirect('/primeiro-acesso');
  redirect(p.totpAtivo ? '/primeiro-acesso/senha' : '/primeiro-acesso/autenticador');
}

export async function definirSenhaPrimeiroAcesso(_: Resultado, form: FormData): Promise<Resultado> {
  const p = await servidorParcial();
  if (!p) redirect('/primeiro-acesso');
  if (!p.totpAtivo || !(await segundaEtapaOkNestaSessao('servidor'))) redirect('/primeiro-acesso/autenticador');
  if (p.cadastroConcluido) redirect('/entrar');
  const senha = String(form.get('senha') ?? '');
  const problema = problemaSenha(senha);
  if (problema) return falha(problema, { senha: problema });
  if (senha !== String(form.get('confirmacao') ?? ''))
    return falha('As senhas não são iguais.', { confirmacao: 'As senhas não são iguais.' });
  const agora = new Date();
  const d = await db();
  await d
    .update(s.usuarioPortal)
    .set({
      senhaHash: await gerarHashSenha(senha),
      senhaAlteradaEm: agora,
      primeiroAcessoEm: agora,
      ultimoLoginEm: agora
    })
    .where(eq(s.usuarioPortal.servidorId, p.id));
  await auditar({ atorTipo: 'servidor', atorId: p.id, acao: 'primeiro_acesso_concluido', entidade: 'usuario_portal' });
  await concluirSegundaEtapa(p.id, 'servidor');
  redirect('/primeiro-acesso/pronto');
}

/* ------------------------------- login ------------------------------- */

export async function entrarPortal(_: Resultado, form: FormData): Promise<Resultado> {
  const usuario = lerUsuario(form);
  const senha = String(form.get('senha') ?? '').slice(0, 200);
  if (!usuario || !senha) return falha('Informe o usuário e a senha.');
  const chave = 'portal:' + usuario;
  if (await bloqueadoAte(chave)) return falha(MSG_BLOQUEIO);

  const r = await tempoMinimo(700, async () => {
    const achado = usuarioValido(usuario) ? await contaPorUsuario(usuario) : null;
    const ok = await conferirSenha(achado?.conta.senhaHash, senha);
    return ok && achado ? achado : null;
  });
  if (!r) {
    await registrarFalha(chave);
    return falha('Usuário ou senha não conferem. Confira e tente de novo.');
  }
  if (testeVencido(r.sv.testeAte)) return falha('Esta conta de teste venceu.');
  await limparFalhas(chave);
  const lembrar = form.get('lembrar') === 'sim';
  const d = await db();

  // Conta de demonstração: entra direto, sem o aplicativo (só enquanto estiver no prazo).
  if (r.sv.testeAte) {
    await d.update(s.usuarioPortal).set({ ultimoLoginEm: new Date() }).where(eq(s.usuarioPortal.servidorId, r.sv.id));
    await iniciarSessao('servidor', r.sv.id, 'completa', lembrar);
    await auditar({ atorTipo: 'servidor', atorId: r.sv.id, acao: 'login_conta_teste', entidade: 'sessao' });
    redirect('/portal');
  }
  if (!r.conta.totpSegredo || !r.conta.primeiroAcessoEm) return falha('Conclua o primeiro acesso para entrar.');
  await encerrarSessao('servidor');
  await iniciarSessao('servidor', r.sv.id, 'senha', lembrar);
  await auditar({ atorTipo: 'servidor', atorId: r.sv.id, acao: 'senha_ok', entidade: 'sessao' });
  redirect('/entrar/verificacao');
}

/** Segunda etapa do login: código do aplicativo ou um código de recuperação. */
export async function verificarCodigoServidor(_: Resultado, form: FormData): Promise<Resultado> {
  const p = await servidorParcial();
  if (!p) redirect('/entrar');
  if (!p.cadastroConcluido || !p.totpAtivo) redirect('/primeiro-acesso');
  const chave = 'mfa-sv:' + p.id;
  if (await bloqueadoAte(chave)) return falha(MSG_BLOQUEIO);

  const entrada = String(form.get('codigo') ?? '').slice(0, 20);
  const d = await db();
  const [c] = await d.select().from(s.usuarioPortal).where(eq(s.usuarioPortal.servidorId, p.id)).limit(1);
  let ok = false;
  let usouRecuperacao = false;
  if (/^\s*\d{3}\s?\d{3}\s*$/.test(entrada)) {
    const segredo = decifrarOuNulo(c.totpSegredo!, 'totp servidor');
    if (!segredo) return falha(MSG_SEGREDO_ILEGIVEL_SV);
    const passo = conferirCodigo(segredo, entrada, c.totpUltimoPasso);
    if (passo !== null) {
      ok = true;
      await d.update(s.usuarioPortal).set({ totpUltimoPasso: passo }).where(eq(s.usuarioPortal.servidorId, p.id));
    }
  } else {
    const usado = await d
      .update(s.codigoRecuperacaoServidor)
      .set({ usadoEm: new Date() })
      .where(
        and(
          eq(s.codigoRecuperacaoServidor.servidorId, p.id),
          eq(s.codigoRecuperacaoServidor.hash, sha256(normalizarRecuperacao(entrada))),
          isNull(s.codigoRecuperacaoServidor.usadoEm)
        )
      )
      .returning({ id: s.codigoRecuperacaoServidor.id });
    ok = usado.length > 0;
    usouRecuperacao = ok;
  }
  if (!ok) {
    await registrarFalha(chave);
    await auditar({ atorTipo: 'servidor', atorId: p.id, acao: 'falha_2fa', entidade: 'sessao' });
    return falha('Código incorreto ou já usado.');
  }
  await limparFalhas(chave);
  await d.update(s.usuarioPortal).set({ ultimoLoginEm: new Date() }).where(eq(s.usuarioPortal.servidorId, p.id));
  await auditar({
    atorTipo: 'servidor',
    atorId: p.id,
    acao: 'login',
    entidade: 'sessao',
    detalhes: { segundaEtapa: usouRecuperacao ? 'codigo_recuperacao' : 'aplicativo' }
  });
  await concluirSegundaEtapa(p.id, 'servidor');
  redirect(usouRecuperacao ? '/portal/conta?recuperacao=1' : '/portal');
}

export async function cancelarAcessoServidor() {
  await encerrarSessao('servidor');
  redirect('/entrar');
}

export async function sairPortal() {
  await encerrarSessao('servidor');
  redirect('/entrar');
}

/* ------------------------- esqueci a senha / usuário ------------------------- */

export async function pedirCodigoSenha(_: Resultado, form: FormData): Promise<Resultado> {
  const usuario = lerUsuario(form);
  if (!usuarioValido(usuario))
    return falha('Digite seu usuário (por exemplo, maria.silva).', { usuario: 'Digite seu usuário.' });
  const chave = 'pedido-senha:' + usuario;
  if (await bloqueadoAte(chave)) return falha(MSG_BLOQUEIO);
  await registrarFalha(chave);
  await tempoMinimo(800, async () => {
    const r = await contaPorUsuario(usuario);
    if (!r || !r.conta.primeiroAcessoEm || r.sv.testeAte) return;
    await enviarCodigo(r.sv, 'redefinir_senha');
  });
  return sucesso(MSG_CODIGO_ENVIADO);
}

export async function redefinirSenhaComCodigo(_: Resultado, form: FormData): Promise<Resultado> {
  const usuario = lerUsuario(form);
  const codigo = lerCodigo(form);
  const senha = String(form.get('senha') ?? '');
  const problema = problemaSenha(senha);
  if (problema) return falha(problema, { senha: problema });
  if (senha !== String(form.get('confirmacao') ?? ''))
    return falha('As senhas não são iguais.', { confirmacao: 'As senhas não são iguais.' });
  const r = usuarioValido(usuario) ? await contaPorUsuario(usuario) : null;
  const chave = 'codigo:' + (r?.sv.id ?? usuario);
  if (await bloqueadoAte(chave)) return falha(MSG_BLOQUEIO);
  const ok = r?.conta.primeiroAcessoEm ? await consumirCodigo(r.sv.id, codigo, 'redefinir_senha') : false;
  if (!ok || !r) {
    await registrarFalha(chave);
    return falha('Código incorreto ou vencido. Confira o e-mail ou peça um novo código.', {
      codigo: 'Código incorreto ou vencido.'
    });
  }
  await limparFalhas(chave);
  const d = await db();
  await d
    .update(s.usuarioPortal)
    .set({ senhaHash: await gerarHashSenha(senha), senhaAlteradaEm: new Date() })
    .where(eq(s.usuarioPortal.servidorId, r.sv.id));
  await auditar({ atorTipo: 'servidor', atorId: r.sv.id, acao: 'redefinir_senha', entidade: 'usuario_portal' });
  await avisarSenhaAlterada(r.sv.emailInstitucional, r.sv.nomeCompleto, 'portal');
  await encerrarTodasSessoes('servidor', r.sv.id);
  await encerrarSessao('servidor');
  redirect('/entrar?senha=ok');
}

/** Envia o usuário para o e-mail institucional de quem informar o CPF. */
export async function lembrarUsuario(_: Resultado, form: FormData): Promise<Resultado> {
  const cpf = lerCpf(form);
  if (cpf.length !== 11)
    return falha('Digite o CPF completo (11 números).', { cpf: 'Digite o CPF completo (11 números).' });
  const chave = 'pedido:' + hashCpf(cpf);
  if (await bloqueadoAte(chave)) return falha(MSG_BLOQUEIO);
  await registrarFalha(chave);
  await tempoMinimo(800, async () => {
    const r = await contaPorCpf(cpf);
    if (!r?.conta.usuario || !r.conta.primeiroAcessoEm) return;
    await enfileirarEmail(
      r.sv.emailInstitucional,
      'Programa Formar: seu usuário',
      `Olá, ${primeiroNome(r.sv.nomeCompleto)}.\n\nSeu usuário no portal do servidor é: ${r.conta.usuario}\n\nEntre em: ${link('/entrar')}\n\nSe você não pediu esta mensagem, ignore-a.`
    );
    await auditar({ atorTipo: 'servidor', atorId: r.sv.id, acao: 'lembrar_usuario', entidade: 'usuario_portal' });
  });
  return sucesso(
    'Se o CPF estiver cadastrado e o primeiro acesso já tiver sido feito, enviamos seu usuário para o e-mail institucional.'
  );
}

/* ----------------------------- minha conta ----------------------------- */

/** Gera novos códigos de recuperação (pede o código atual do aplicativo). */
export async function novosCodigosRecuperacaoServidor(_: ResultadoCodigos, form: FormData): Promise<ResultadoCodigos> {
  const sv = await exigirServidor();
  const chave = 'mfa-sv:' + sv.id;
  if (await bloqueadoAte(chave)) return falha(MSG_BLOQUEIO);
  const d = await db();
  const [c] = await d.select().from(s.usuarioPortal).where(eq(s.usuarioPortal.servidorId, sv.id)).limit(1);
  const segredo = c?.totpSegredo ? decifrarOuNulo(c.totpSegredo, 'totp servidor') : null;
  if (c?.totpSegredo && !segredo) return falha(MSG_SEGREDO_ILEGIVEL_SV);
  const passo = segredo ? conferirCodigo(segredo, String(form.get('codigo') ?? ''), c.totpUltimoPasso) : null;
  if (passo === null) {
    await registrarFalha(chave);
    return falha('Código do aplicativo incorreto.');
  }
  await limparFalhas(chave);
  await d.update(s.usuarioPortal).set({ totpUltimoPasso: passo }).where(eq(s.usuarioPortal.servidorId, sv.id));
  const codigos = await salvarCodigosRecuperacao(sv.id);
  await auditar({ atorTipo: 'servidor', atorId: sv.id, acao: 'novos_codigos_recuperacao', entidade: 'usuario_portal' });
  return { ok: true, mensagem: 'Novos códigos gerados. Os anteriores deixaram de valer.', t: Date.now(), codigos };
}
