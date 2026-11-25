'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull, ne, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema as s } from '@/db';
import { falha, sucesso, type Resultado } from '@/lib/acao';
import { auditar } from '@/lib/auditoria';
import { cifrar, hashCpf, hashDocumento, tokenAleatorio } from '@/lib/cripto';
import { enfileirarEmail, link } from '@/lib/email';
import { encerrarTodasSessoes, exigirAdmin } from '@/lib/auth/sessao';
import { gerarHashSenha } from '@/lib/auth/senha';
import { usuarioLivreGestor } from '@/lib/auth/usuario-gestor';
import {
  cpfValido,
  documentoValido,
  mascararCpf,
  normalizarBusca,
  normalizarDocumento,
  primeiroNome,
  somenteDigitos,
  type TipoDocumento
} from '@/lib/dominio/regras';

const uuid = z.string().uuid();
/**
 * Convite da gestão: o primeiro acesso é feito em /gestao/primeiro-acesso com o CPF ou CNPJ cadastrado
 * (código no e-mail → autenticador → senha), igual ao portal do servidor.
 */
async function enviarConviteGestor(nome: string, email: string, usuario: string, motivo: 'novo' | 'zerado') {
  await enfileirarEmail(
    email,
    motivo === 'novo' ? 'Programa Formar: seu acesso à gestão' : 'Programa Formar: refaça o primeiro acesso à gestão',
    `Olá, ${primeiroNome(nome)}.\n\n${motivo === 'novo' ? 'Você recebeu acesso à gestão de formações do Programa Formar.' : 'A administração do Programa Formar zerou o acesso da sua conta na gestão (senha e aplicativo autenticador). Para voltar a entrar, refaça o primeiro acesso.'}\n\nSeu usuário de acesso é: ${usuario}\nGuarde-o: é com ele (e não com o e-mail nem com o documento) que você entra na gestão.\n\nPara ativar o acesso:\n1. Abra ${link('/gestao/primeiro-acesso')}\n2. Informe o CPF ou o CNPJ cadastrado na sua conta.\n3. Digite o código que chegará neste e-mail.\n4. Cadastre o aplicativo autenticador no celular e crie sua senha.\n\nSe você não esperava este e-mail, avise o núcleo de formação da SEMED.`
  );
}

/** CPF ou CNPJ do formulário (tipo escolhido + número). Vazio devolve null; inválido devolve a mensagem. */
function lerDocumentoForm(form: FormData): { tipo: TipoDocumento; valor: string } | { erro: string } | null {
  const valor = normalizarDocumento(String(form.get('documento') ?? '').slice(0, 24));
  if (!valor) return null;
  const tipo = String(form.get('documentoTipo') ?? '') === 'cnpj' ? 'cnpj' : 'cpf';
  if (!documentoValido(tipo, valor))
    return {
      erro: tipo === 'cpf' ? 'CPF inválido: confira os 11 números.' : 'CNPJ inválido: confira os 14 caracteres.'
    };
  return { tipo, valor };
}

async function documentoEmUso(hash: string, excetoId?: string) {
  const d = await db();
  const [r] = await d
    .select({ id: s.gestor.id })
    .from(s.gestor)
    .where(
      excetoId ? and(eq(s.gestor.documentoHash, hash), ne(s.gestor.id, excetoId)) : eq(s.gestor.documentoHash, hash)
    )
    .limit(1);
  return Boolean(r);
}

const MSG_DOC_USO = 'Já existe uma conta da gestão com esse documento.';

/** Alvo de uma ação administrativa: nunca outro administrador nem a própria conta. */
async function alvoGestor(id: string, adminId: string) {
  if (!uuid.safeParse(id).success || id === adminId) return null;
  const d = await db();
  const [g] = await d
    .select()
    .from(s.gestor)
    .where(and(eq(s.gestor.id, id), ne(s.gestor.perfil, 'admin')))
    .limit(1);
  return g ?? null;
}

const esquemaNovo = z.object({
  nome: z.string().trim().min(3, 'Informe o nome completo.').max(120, 'Nome muito longo.'),
  email: z.string().trim().toLowerCase().email('E-mail inválido.').max(160, 'E-mail muito longo.')
});

export async function criarGestor(_: Resultado, form: FormData): Promise<Resultado> {
  const adm = await exigirAdmin();
  const p = esquemaNovo.safeParse({ nome: form.get('nome'), email: form.get('email') });
  if (!p.success) {
    const erros: Record<string, string> = {};
    for (const i of p.error.issues) erros[String(i.path[0])] ??= i.message;
    return falha('Confira os campos destacados.', erros);
  }
  const doc = lerDocumentoForm(form);
  if (!doc) return falha('Informe o CPF ou o CNPJ da pessoa.', { documento: 'Informe o CPF ou o CNPJ da pessoa.' });
  if ('erro' in doc) return falha(doc.erro, { documento: doc.erro });
  const documentoHash = hashDocumento(doc.tipo, doc.valor);
  const d = await db();
  const [existe] = await d.select({ id: s.gestor.id }).from(s.gestor).where(eq(s.gestor.email, p.data.email)).limit(1);
  if (existe) return falha('Já existe uma conta com esse e-mail.', { email: 'Já existe uma conta com esse e-mail.' });
  if (await documentoEmUso(documentoHash)) return falha(MSG_DOC_USO, { documento: MSG_DOC_USO });
  const usuario = await usuarioLivreGestor(p.data.nome);
  // Senha inutilizável até a pessoa criar a dela no primeiro acesso.
  const [g] = await d
    .insert(s.gestor)
    .values({
      nome: p.data.nome,
      email: p.data.email,
      usuario,
      senhaHash: await gerarHashSenha(tokenAleatorio(48)),
      documentoTipo: doc.tipo,
      documentoHash,
      documentoCifrado: cifrar(doc.valor),
      perfil: 'gestor_nucleo',
      criadoPor: adm.id
    })
    .returning({ id: s.gestor.id });
  await enviarConviteGestor(p.data.nome, p.data.email, usuario, 'novo');
  await auditar({
    atorTipo: 'gestor',
    atorId: adm.id,
    acao: 'criar_gestor',
    entidade: 'gestor',
    entidadeId: g.id,
    detalhes: { email: p.data.email, usuario, documento: doc.tipo }
  });
  revalidatePath('/gestao/admin/gestores');
  return sucesso(`Conta criada com o usuário ${usuario}. O convite foi enviado para ${p.data.email}.`);
}

export async function acaoGestor(_: Resultado, form: FormData): Promise<Resultado> {
  const adm = await exigirAdmin();
  const g = await alvoGestor(String(form.get('gestorId') ?? ''), adm.id);
  if (!g) return falha('Conta não encontrada ou não pode ser alterada aqui.');
  const acao = String(form.get('acao') ?? '');
  const d = await db();

  if (acao === 'reenviar') {
    if (g.primeiroAcessoEm) return falha(`${g.nome} já concluiu o primeiro acesso. Para refazer, use "Zerar acesso".`);
    if (!g.documentoHash) return falha('Cadastre o CPF ou o CNPJ da pessoa antes de enviar o convite.');
    await enviarConviteGestor(g.nome, g.email, g.usuario, 'novo');
    await auditar({
      atorTipo: 'gestor',
      atorId: adm.id,
      acao: 'reenviar_convite_gestor',
      entidade: 'gestor',
      entidadeId: g.id
    });
    revalidatePath('/gestao/admin/gestores');
    return sucesso(`Convite de primeiro acesso reenviado para ${g.email}.`);
  }
  if (acao === 'zerar_acesso') {
    if (!g.documentoHash) return falha('Cadastre o CPF ou o CNPJ da pessoa antes de zerar o acesso.');
    await d.transaction(async tx => {
      await tx
        .update(s.gestor)
        .set({
          senhaHash: await gerarHashSenha(tokenAleatorio(48)),
          primeiroAcessoEm: null,
          totpSegredo: null,
          totpPendente: null,
          totpAtivadoEm: null,
          totpUltimoPasso: null
        })
        .where(eq(s.gestor.id, g.id));
      await tx.delete(s.codigoRecuperacao).where(eq(s.codigoRecuperacao.gestorId, g.id));
      await tx
        .update(s.tokenGestor)
        .set({ usadoEm: new Date() })
        .where(and(eq(s.tokenGestor.gestorId, g.id), isNull(s.tokenGestor.usadoEm)));
    });
    await encerrarTodasSessoes('gestor', g.id);
    await enviarConviteGestor(g.nome, g.email, g.usuario, 'zerado');
    await auditar({
      atorTipo: 'gestor',
      atorId: adm.id,
      acao: 'zerar_acesso_gestor',
      entidade: 'gestor',
      entidadeId: g.id
    });
    revalidatePath('/gestao/admin/gestores');
    return sucesso(
      `Acesso de ${g.nome} zerado. A pessoa recebeu um e-mail para refazer o primeiro acesso com o CPF ou CNPJ.`
    );
  }
  if (acao === 'desativar' || acao === 'reativar') {
    const ativo = acao === 'reativar';
    await d.update(s.gestor).set({ ativo }).where(eq(s.gestor.id, g.id));
    if (!ativo) await encerrarTodasSessoes('gestor', g.id);
    await auditar({
      atorTipo: 'gestor',
      atorId: adm.id,
      acao: ativo ? 'reativar_gestor' : 'desativar_gestor',
      entidade: 'gestor',
      entidadeId: g.id
    });
    revalidatePath('/gestao/admin/gestores');
    return sucesso(ativo ? `${g.nome} pode voltar a entrar.` : `Acesso de ${g.nome} desativado e sessões encerradas.`);
  }
  if (acao === 'redefinir_2fa') {
    await d.transaction(async tx => {
      await tx
        .update(s.gestor)
        .set({ totpSegredo: null, totpPendente: null, totpAtivadoEm: null, totpUltimoPasso: null })
        .where(eq(s.gestor.id, g.id));
      await tx.delete(s.codigoRecuperacao).where(eq(s.codigoRecuperacao.gestorId, g.id));
    });
    await encerrarTodasSessoes('gestor', g.id);
    await auditar({
      atorTipo: 'gestor',
      atorId: adm.id,
      acao: 'redefinir_2fa_gestor',
      entidade: 'gestor',
      entidadeId: g.id
    });
    revalidatePath('/gestao/admin/gestores');
    return sucesso(
      `Verificação em duas etapas de ${g.nome} redefinida. No próximo acesso, a pessoa configura de novo.`
    );
  }
  if (acao === 'encerrar_sessoes') {
    await encerrarTodasSessoes('gestor', g.id);
    await auditar({
      atorTipo: 'gestor',
      atorId: adm.id,
      acao: 'encerrar_sessoes_gestor',
      entidade: 'gestor',
      entidadeId: g.id
    });
    return sucesso(`Sessões de ${g.nome} encerradas.`);
  }
  return falha('Ação desconhecida.');
}

/** Ativa ou desativa um servidor da base (desativado não entra no portal nem aparece na busca). */
export async function alternarServidor(_: Resultado, form: FormData): Promise<Resultado> {
  const adm = await exigirAdmin();
  const id = String(form.get('servidorId') ?? '');
  if (!uuid.safeParse(id).success) return falha('Servidor inválido.');
  const ativo = form.get('ativo') === '1';
  const d = await db();
  const r = await d
    .update(s.servidor)
    .set({ ativo, atualizadoEm: new Date() })
    .where(eq(s.servidor.id, id))
    .returning({ nome: s.servidor.nomeCompleto });
  if (!r.length) return falha('Servidor não encontrado.');
  if (!ativo) await encerrarTodasSessoes('servidor', id);
  await auditar({
    atorTipo: 'gestor',
    atorId: adm.id,
    acao: 'alterar_servidor',
    entidade: 'servidor',
    entidadeId: id,
    detalhes: { ativo }
  });
  revalidatePath('/gestao/admin/servidores');
  return sucesso(
    ativo ? `${r[0].nome} reativado(a).` : `${r[0].nome} desativado(a); o acesso ao portal foi encerrado.`
  );
}

/**
 * Zera o acesso do servidor ao portal (perdeu o celular e os códigos de recuperação, ou suspeita de invasão):
 * apaga senha, aplicativo autenticador e códigos, encerra as sessões. O usuário continua o mesmo;
 * a pessoa refaz o primeiro acesso com o CPF e o código enviado ao e-mail institucional.
 */
export async function zerarAcessoPortal(_: Resultado, form: FormData): Promise<Resultado> {
  const adm = await exigirAdmin();
  const id = String(form.get('servidorId') ?? '');
  if (!uuid.safeParse(id).success) return falha('Servidor inválido.');
  const d = await db();
  const [sv] = await d
    .select({ nome: s.servidor.nomeCompleto, email: s.servidor.emailInstitucional })
    .from(s.servidor)
    .innerJoin(s.usuarioPortal, eq(s.usuarioPortal.servidorId, s.servidor.id))
    .where(eq(s.servidor.id, id))
    .limit(1);
  if (!sv) return falha('Este servidor ainda não tem conta no portal.');
  await d.transaction(async tx => {
    await tx
      .update(s.usuarioPortal)
      .set({
        senhaHash: null,
        primeiroAcessoEm: null,
        totpSegredo: null,
        totpPendente: null,
        totpAtivadoEm: null,
        totpUltimoPasso: null
      })
      .where(eq(s.usuarioPortal.servidorId, id));
    await tx.delete(s.codigoRecuperacaoServidor).where(eq(s.codigoRecuperacaoServidor.servidorId, id));
    await tx
      .update(s.tokenAcesso)
      .set({ usadoEm: new Date() })
      .where(and(eq(s.tokenAcesso.servidorId, id), isNull(s.tokenAcesso.usadoEm)));
    await enfileirarEmail(
      sv.email,
      'Programa Formar: seu acesso ao portal foi redefinido',
      `Olá, ${primeiroNome(sv.nome)}.

A administração do Programa Formar redefiniu seu acesso ao portal do servidor, a seu pedido ou por segurança.
Para voltar a entrar, faça o primeiro acesso de novo em ${link('/primeiro-acesso')} — você vai precisar do seu CPF, deste e-mail e do aplicativo autenticador no celular. Seu usuário continua o mesmo.

Se você não pediu isso, avise o núcleo de formação da SEMED.`,
      tx
    );
    await auditar(
      { atorTipo: 'gestor', atorId: adm.id, acao: 'zerar_acesso_portal', entidade: 'usuario_portal', entidadeId: id },
      tx
    );
  });
  await encerrarTodasSessoes('servidor', id);
  revalidatePath('/gestao/admin/servidores');
  return sucesso(`Acesso de ${sv.nome} zerado. A pessoa recebeu um e-mail para refazer o primeiro acesso.`);
}

/** Devolve à fila os e-mails que falharam de vez (ex.: depois de corrigir a configuração do SES). */
export async function reenviarEmailsComFalha(): Promise<Resultado> {
  const adm = await exigirAdmin();
  const { reenviarFalhas } = await import('@/lib/email-envio');
  const n = await reenviarFalhas();
  await auditar({
    atorTipo: 'gestor',
    atorId: adm.id,
    acao: 'reenviar_emails',
    entidade: 'email_saida',
    detalhes: { quantidade: n }
  });
  revalidatePath('/gestao/admin/emails');
  return sucesso(n ? `${n} e-mail(s) voltaram para a fila.` : 'Não havia e-mails com falha.');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const textoLimpo = (v: FormDataEntryValue | null) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/** Avisa o endereço antigo quando o e-mail de uma conta é trocado (protege contra troca indevida). */
async function avisarTrocaEmail(antigo: string, novo: string, nome: string) {
  const [u, dom] = novo.split('@');
  const mascara = `${u.slice(0, 2)}${'*'.repeat(Math.max(1, u.length - 2))}@${dom}`;
  await enfileirarEmail(
    antigo,
    'Programa Formar: o e-mail da sua conta foi alterado',
    `Olá, ${primeiroNome(nome)}.\n\nA administração do Programa Formar alterou o e-mail cadastrado na sua conta para ${mascara}. A partir de agora, códigos e avisos vão para o novo endereço.\n\nSe você não pediu essa mudança, avise o núcleo de formação da SEMED.`
  );
}

/** Administração: corrige nome e e-mail de uma conta da gestão (não vale para administradores). */
export async function editarGestor(_: Resultado, form: FormData): Promise<Resultado> {
  const adm = await exigirAdmin();
  const g = await alvoGestor(String(form.get('gestorId') ?? ''), adm.id);
  if (!g) return falha('Conta não encontrada ou não pode ser alterada aqui.');
  const p = esquemaNovo.safeParse({ nome: form.get('nome'), email: form.get('email') });
  if (!p.success) {
    const erros: Record<string, string> = {};
    for (const i of p.error.issues) erros[String(i.path[0])] ??= i.message;
    return falha('Confira os campos destacados.', erros);
  }
  const { nome, email } = p.data;
  const doc = lerDocumentoForm(form);
  if (doc && 'erro' in doc) return falha(doc.erro, { documento: doc.erro });
  const novoDoc = doc ? { tipo: doc.tipo, hash: hashDocumento(doc.tipo, doc.valor), valor: doc.valor } : null;
  const mudou: string[] = [];
  if (nome !== g.nome) mudou.push('nome');
  if (email !== g.email) mudou.push('email');
  if (novoDoc && novoDoc.hash !== g.documentoHash) mudou.push('documento');
  if (!mudou.length) return sucesso('Nada mudou.');
  const d = await db();
  if (mudou.includes('documento') && (await documentoEmUso(novoDoc!.hash, g.id)))
    return falha(MSG_DOC_USO, { documento: MSG_DOC_USO });
  if (email !== g.email) {
    const [existe] = await d.select({ id: s.gestor.id }).from(s.gestor).where(eq(s.gestor.email, email)).limit(1);
    if (existe) return falha('Já existe uma conta com esse e-mail.', { email: 'Já existe uma conta com esse e-mail.' });
  }
  await d
    .update(s.gestor)
    .set({
      nome,
      email,
      ...(mudou.includes('documento')
        ? { documentoTipo: novoDoc!.tipo, documentoHash: novoDoc!.hash, documentoCifrado: cifrar(novoDoc!.valor) }
        : {})
    })
    .where(eq(s.gestor.id, g.id));
  let extra = '';
  if (email !== g.email) {
    await avisarTrocaEmail(g.email, email, nome);
    // Links e códigos enviados ao endereço antigo deixam de valer; convite pendente vai para o novo.
    await d
      .update(s.tokenGestor)
      .set({ usadoEm: new Date() })
      .where(and(eq(s.tokenGestor.gestorId, g.id), isNull(s.tokenGestor.usadoEm)));
    if (!g.primeiroAcessoEm && (novoDoc?.hash ?? g.documentoHash)) {
      await enviarConviteGestor(nome, email, g.usuario, 'novo');
      extra = ' O convite foi reenviado para o novo e-mail.';
    }
  }
  await auditar({
    atorTipo: 'gestor',
    atorId: adm.id,
    acao: 'editar_gestor',
    entidade: 'gestor',
    entidadeId: g.id,
    detalhes: { campos: mudou }
  });
  revalidatePath('/gestao/admin/gestores');
  return sucesso(`Conta de ${nome} atualizada.${extra}`);
}

/** Administração: corrige os dados de um servidor da base (nome, CPF, matrícula, e-mail, função, lotação). */
export async function editarServidor(_: Resultado, form: FormData): Promise<Resultado> {
  const adm = await exigirAdmin();
  const id = String(form.get('servidorId') ?? '');
  if (!uuid.safeParse(id).success) return falha('Servidor inválido.');
  const nome = textoLimpo(form.get('nome'));
  const cpfNovo = somenteDigitos(String(form.get('cpf') ?? ''));
  const matricula = somenteDigitos(String(form.get('matricula') ?? ''));
  const email = textoLimpo(form.get('email')).toLowerCase();
  const funcao = textoLimpo(form.get('funcao')) || null;
  const lotacao = textoLimpo(form.get('lotacao')) || null;

  const erros: Record<string, string> = {};
  if (nome.length < 3 || nome.length > 160) erros.nome = 'Informe o nome completo.';
  if (cpfNovo && !cpfValido(cpfNovo)) erros.cpf = 'CPF inválido.';
  if (!matricula || matricula.length > 12) erros.matricula = 'Matrícula inválida (só números, até 12).';
  if (!EMAIL_RE.test(email) || email.length > 160) erros.email = 'E-mail inválido.';
  if ((funcao?.length ?? 0) > 160) erros.funcao = 'Muito longo.';
  if ((lotacao?.length ?? 0) > 160) erros.lotacao = 'Muito longo.';
  if (Object.keys(erros).length) return falha('Confira os campos destacados.', erros);

  const d = await db();
  const [sv] = await d.select().from(s.servidor).where(eq(s.servidor.id, id)).limit(1);
  if (!sv) return falha('Servidor não encontrado.');
  const cpfHash = cpfNovo ? hashCpf(cpfNovo) : sv.cpfHash;

  const mudou: string[] = [];
  if (nome !== sv.nomeCompleto) mudou.push('nome');
  if (cpfHash !== sv.cpfHash) mudou.push('cpf');
  if (matricula !== sv.matricula) mudou.push('matricula');
  if (email !== sv.emailInstitucional) mudou.push('email');
  if (funcao !== sv.funcao) mudou.push('funcao');
  if (lotacao !== sv.lotacao) mudou.push('lotacao');
  if (!mudou.length) return sucesso('Nada mudou.');

  const outro = async (cond: SQL) =>
    (
      await d
        .select({ id: s.servidor.id })
        .from(s.servidor)
        .where(and(cond, ne(s.servidor.id, id)))
        .limit(1)
    ).length > 0;
  if (mudou.includes('cpf') && (await outro(eq(s.servidor.cpfHash, cpfHash))))
    return falha('Outro servidor já tem esse CPF.', { cpf: 'Outro servidor já tem esse CPF.' });
  if (mudou.includes('matricula') && (await outro(eq(s.servidor.matricula, matricula))))
    return falha('Outro servidor já tem essa matrícula.', { matricula: 'Outro servidor já tem essa matrícula.' });
  if (mudou.includes('email') && (await outro(eq(s.servidor.emailInstitucional, email))))
    return falha('Outro servidor já usa esse e-mail.', { email: 'Outro servidor já usa esse e-mail.' });

  await d
    .update(s.servidor)
    .set({
      nomeCompleto: nome,
      nomeBusca: normalizarBusca(nome),
      matricula,
      emailInstitucional: email,
      funcao,
      lotacao,
      ...(mudou.includes('cpf') ? { cpfHash, cpfCifrado: cifrar(cpfNovo), cpfMascara: mascararCpf(cpfNovo) } : {}),
      atualizadoEm: new Date()
    })
    .where(eq(s.servidor.id, id));
  if (mudou.includes('email')) {
    await avisarTrocaEmail(sv.emailInstitucional, email, nome);
    // Códigos e links enviados ao endereço antigo deixam de valer.
    await d
      .update(s.tokenAcesso)
      .set({ usadoEm: new Date() })
      .where(and(eq(s.tokenAcesso.servidorId, id), isNull(s.tokenAcesso.usadoEm)));
  }
  await auditar({
    atorTipo: 'gestor',
    atorId: adm.id,
    acao: 'editar_servidor',
    entidade: 'servidor',
    entidadeId: id,
    detalhes: { campos: mudou }
  });
  revalidatePath('/gestao/admin/servidores');
  return sucesso(`Dados de ${nome} atualizados.`);
}
