import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db, schema, type Tx } from '@/db';
import { auditar } from '@/lib/auditoria';
import { enfileirarEmail, link } from '@/lib/email';
import { hojeISO } from './datas';
import {
  cargaCumprida,
  certificadoLiberado,
  codigoValidacao,
  dataBR,
  frequenciaPct,
  periodo,
  primeiroNome,
  proximoStatus,
  statusFormacao,
  type StatusParticipacao
} from './regras';

const s = schema;

export class ErroNegocio extends Error {}

/* ------------------------------------------------------------------ */
/* Leitura                                                              */
/* ------------------------------------------------------------------ */

export type ResumoFormacao = {
  id: string;
  titulo: string;
  programaEixo: string;
  formador: string;
  cargaTotal: number;
  status: 'planejada' | 'em_andamento' | 'encerrada';
  totalEncontros: number;
  realizados: number;
  periodo: string;
  vinculados: number;
  liberados: number;
  conferencia: number;
};

export async function listarFormacoes(): Promise<ResumoFormacao[]> {
  const d = await db();
  const forms = await d.select().from(s.formacao).orderBy(asc(s.formacao.criadoEm));
  if (!forms.length) return [];
  const ids = forms.map(f => f.id);
  const encs = await d
    .select({ formacaoId: s.encontro.formacaoId, data: s.encontro.data, realizado: s.encontro.realizado })
    .from(s.encontro)
    .where(inArray(s.encontro.formacaoId, ids));
  const parts = await d
    .select({ formacaoId: s.participacao.formacaoId, status: s.participacao.status })
    .from(s.participacao)
    .where(inArray(s.participacao.formacaoId, ids));

  return forms.map(f => {
    const e = encs.filter(x => x.formacaoId === f.id);
    const p = parts.filter(x => x.formacaoId === f.id);
    return {
      id: f.id,
      titulo: f.titulo,
      programaEixo: f.programaEixo,
      formador: f.formador,
      cargaTotal: f.cargaPresencialH + f.cargaEstudoH,
      status: f.status,
      totalEncontros: e.length,
      realizados: e.filter(x => x.realizado).length,
      periodo: periodo(e.map(x => x.data)),
      vinculados: p.length,
      liberados: p.filter(x => certificadoLiberado(x.status)).length,
      conferencia: p.filter(x => x.status === 'em_conferencia').length
    };
  });
}

export async function contarConferencia(): Promise<number> {
  const d = await db();
  const [r] = await d
    .select({ n: sql<number>`count(*)::int` })
    .from(s.participacao)
    .where(eq(s.participacao.status, 'em_conferencia'));
  return r?.n ?? 0;
}

export type LinhaParticipante = {
  participacaoId: string;
  servidorId: string;
  nome: string;
  cpfMascara: string;
  matricula: string;
  email: string;
  funcao: string | null;
  lotacao: string | null;
  status: StatusParticipacao;
  presencas: Record<string, boolean>; // encontroId → presente
  totalPresencas: number;
  freqPct: number;
  cargaCumprida: number;
  certificado: { id: string; codigo: string; dataEmissao: string } | null;
  motivoRecusa: string | null;
};

export async function obterFormacao(id: string) {
  const d = await db();
  const [f] = await d.select().from(s.formacao).where(eq(s.formacao.id, id)).limit(1);
  if (!f) return null;
  const encontros = await d
    .select()
    .from(s.encontro)
    .where(eq(s.encontro.formacaoId, id))
    .orderBy(asc(s.encontro.ordem));
  const parts = await d
    .select({
      p: s.participacao,
      sv: {
        id: s.servidor.id,
        nome: s.servidor.nomeCompleto,
        cpfMascara: s.servidor.cpfMascara,
        matricula: s.servidor.matricula,
        email: s.servidor.emailInstitucional,
        funcao: s.servidor.funcao,
        lotacao: s.servidor.lotacao
      }
    })
    .from(s.participacao)
    .innerJoin(s.servidor, eq(s.servidor.id, s.participacao.servidorId))
    .where(eq(s.participacao.formacaoId, id))
    .orderBy(asc(s.servidor.nomeCompleto));
  const pids = parts.map(x => x.p.id);
  const pres = pids.length ? await d.select().from(s.presenca).where(inArray(s.presenca.participacaoId, pids)) : [];
  const certs = pids.length
    ? await d
        .select()
        .from(s.certificado)
        .where(and(inArray(s.certificado.participacaoId, pids), isNull(s.certificado.revogadoEm)))
    : [];
  const [modelo] = f.modeloCertificadoId
    ? await d.select().from(s.modeloCertificado).where(eq(s.modeloCertificado.id, f.modeloCertificadoId)).limit(1)
    : [];

  const n = encontros.length;
  const cargaTotal = f.cargaPresencialH + f.cargaEstudoH;
  const realizados = new Set(encontros.filter(e => e.realizado).map(e => e.id));

  const participantes: LinhaParticipante[] = parts.map(({ p, sv }) => {
    const mapa: Record<string, boolean> = {};
    for (const pr of pres)
      if (pr.participacaoId === p.id && realizados.has(pr.encontroId)) mapa[pr.encontroId] = pr.presente;
    // Encontro realizado sem registro conta como falta (ex.: vinculado depois).
    for (const eid of realizados) if (!(eid in mapa)) mapa[eid] = false;
    const total = Object.values(mapa).filter(Boolean).length;
    const c = certs.find(x => x.participacaoId === p.id);
    return {
      participacaoId: p.id,
      servidorId: sv.id,
      nome: sv.nome,
      cpfMascara: sv.cpfMascara,
      matricula: sv.matricula,
      email: sv.email,
      funcao: sv.funcao,
      lotacao: sv.lotacao,
      status: p.status,
      presencas: mapa,
      totalPresencas: total,
      freqPct: frequenciaPct(total, n),
      cargaCumprida: cargaCumprida(cargaTotal, total, n),
      certificado: c ? { id: c.id, codigo: c.codigoValidacao, dataEmissao: c.dataEmissao } : null,
      motivoRecusa: p.motivoRecusa
    };
  });

  return {
    formacao: f,
    modelo: modelo ?? null,
    encontros,
    participantes,
    cargaTotal,
    totalEncontros: n,
    realizados: realizados.size,
    periodo: periodo(encontros.map(e => e.data)),
    freqMinima: Number(f.freqMinima)
  };
}

export type DetalheFormacao = NonNullable<Awaited<ReturnType<typeof obterFormacao>>>;

export async function listarConferencia() {
  const d = await db();
  const rows = await d
    .select({ formacaoId: s.participacao.formacaoId })
    .from(s.participacao)
    .where(eq(s.participacao.status, 'em_conferencia'));
  const ids = [...new Set(rows.map(r => r.formacaoId))];
  const out: { formacao: DetalheFormacao; participante: LinhaParticipante }[] = [];
  for (const id of ids) {
    const det = await obterFormacao(id);
    if (!det) continue;
    for (const p of det.participantes) if (p.status === 'em_conferencia') out.push({ formacao: det, participante: p });
  }
  return out;
}

/** Busca na base da SEMED por nome, matrícula ou CPF (pelo hash). Exclui quem já está vinculado. */
export async function buscarServidores(q: string, formacaoId: string, cpfHash: string | null) {
  const d = await db();
  const termo = q.trim();
  const digitos = termo.replace(/\D/g, '');
  const nome = termo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[%_\\]/g, '');
  const condicoes = [sql`${s.servidor.nomeBusca} like ${'%' + nome + '%'}`];
  if (digitos.length >= 2) condicoes.push(sql`${s.servidor.matricula} like ${digitos + '%'}`);
  if (cpfHash) condicoes.push(eq(s.servidor.cpfHash, cpfHash));
  const vinculados = d
    .select({ id: s.participacao.servidorId })
    .from(s.participacao)
    .where(eq(s.participacao.formacaoId, formacaoId));
  return d
    .select({
      id: s.servidor.id,
      nome: s.servidor.nomeCompleto,
      cpfMascara: s.servidor.cpfMascara,
      matricula: s.servidor.matricula,
      email: s.servidor.emailInstitucional,
      funcao: s.servidor.funcao,
      lotacao: s.servidor.lotacao
    })
    .from(s.servidor)
    .where(
      and(
        eq(s.servidor.ativo, true),
        sql`(${sql.join(condicoes, sql` or `)})`,
        sql`${s.servidor.id} not in ${vinculados}`
      )
    )
    .orderBy(asc(s.servidor.nomeCompleto))
    .limit(6);
}

/* ------------------------------------------------------------------ */
/* Escrita — gestão                                                     */
/* ------------------------------------------------------------------ */

export type DadosFormacao = {
  titulo: string;
  tituloCurto: string;
  programaEixo: string;
  formador: string;
  local: string;
  cargaPresencialH: number;
  cargaEstudoH: number;
  conteudoProgramatico: string;
  prefixoCodigo: string;
};

export async function criarFormacao(dados: DadosFormacao, gestorId: string) {
  const d = await db();
  const [modelo] = await d
    .select({ id: s.modeloCertificado.id })
    .from(s.modeloCertificado)
    .where(eq(s.modeloCertificado.emUso, true))
    .limit(1);
  return d.transaction(async tx => {
    const [f] = await tx
      .insert(s.formacao)
      .values({ ...dados, modeloCertificadoId: modelo?.id ?? null, criadoPor: gestorId })
      .returning({ id: s.formacao.id });
    await auditar(
      {
        atorTipo: 'gestor',
        atorId: gestorId,
        acao: 'criar',
        entidade: 'formacao',
        entidadeId: f.id,
        detalhes: { titulo: dados.titulo }
      },
      tx
    );
    return f.id;
  });
}

export async function atualizarFormacao(id: string, dados: DadosFormacao, gestorId: string) {
  const d = await db();
  await d.transaction(async tx => {
    const r = await tx
      .update(s.formacao)
      .set({ ...dados, atualizadoEm: new Date() })
      .where(eq(s.formacao.id, id))
      .returning({ id: s.formacao.id });
    if (!r.length) throw new ErroNegocio('Formação não encontrada.');
    await auditar({ atorTipo: 'gestor', atorId: gestorId, acao: 'editar', entidade: 'formacao', entidadeId: id }, tx);
  });
}

export async function adicionarEncontro(formacaoId: string, data: string, modulo: string, gestorId: string) {
  const d = await db();
  await d.transaction(async tx => {
    await travarFormacao(tx, formacaoId);
    const [m] = await tx
      .select({ max: sql<number>`coalesce(max(${s.encontro.ordem}), 0)::int` })
      .from(s.encontro)
      .where(eq(s.encontro.formacaoId, formacaoId));
    const [ultimo] = await tx
      .select({ data: s.encontro.data })
      .from(s.encontro)
      .where(eq(s.encontro.formacaoId, formacaoId))
      .orderBy(sql`${s.encontro.ordem} desc`)
      .limit(1);
    if (ultimo && data < ultimo.data)
      throw new ErroNegocio('A data precisa ser igual ou posterior ao último encontro.');
    const [e] = await tx
      .insert(s.encontro)
      .values({ formacaoId, ordem: (m?.max ?? 0) + 1, data, modulo })
      .returning({ id: s.encontro.id });
    await auditar(
      {
        atorTipo: 'gestor',
        atorId: gestorId,
        acao: 'adicionar_encontro',
        entidade: 'formacao',
        entidadeId: formacaoId,
        detalhes: { encontroId: e.id, data }
      },
      tx
    );
    // Um encontro novo reabre a formação: certificados voltam a aguardar o encerramento.
    await recalcular(tx, formacaoId, gestorId);
  });
}

export async function removerEncontro(formacaoId: string, encontroId: string, gestorId: string) {
  const d = await db();
  await d.transaction(async tx => {
    await travarFormacao(tx, formacaoId);
    const [e] = await tx
      .select()
      .from(s.encontro)
      .where(and(eq(s.encontro.id, encontroId), eq(s.encontro.formacaoId, formacaoId)))
      .limit(1);
    if (!e) throw new ErroNegocio('Encontro não encontrado.');
    if (e.realizado) throw new ErroNegocio('Encontros já realizados não podem ser removidos.');
    const [ult] = await tx
      .select({ max: sql<number>`max(${s.encontro.ordem})::int` })
      .from(s.encontro)
      .where(eq(s.encontro.formacaoId, formacaoId));
    if (ult?.max !== e.ordem) throw new ErroNegocio('Remova primeiro os encontros posteriores.');
    await tx.delete(s.encontro).where(eq(s.encontro.id, encontroId));
    await auditar(
      {
        atorTipo: 'gestor',
        atorId: gestorId,
        acao: 'remover_encontro',
        entidade: 'formacao',
        entidadeId: formacaoId,
        detalhes: { ordem: e.ordem }
      },
      tx
    );
    await recalcular(tx, formacaoId, gestorId);
  });
}

export async function vincularServidor(formacaoId: string, servidorId: string, gestorId: string) {
  const d = await db();
  return d.transaction(async tx => {
    const f = await travarFormacao(tx, formacaoId);
    if (f.status === 'encerrada')
      throw new ErroNegocio('A formação já foi encerrada. Adicione um encontro para reabri-la.');
    const [sv] = await tx
      .select()
      .from(s.servidor)
      .where(and(eq(s.servidor.id, servidorId), eq(s.servidor.ativo, true)))
      .limit(1);
    if (!sv) throw new ErroNegocio('Servidor não encontrado na base da SEMED.');
    const ja = await tx
      .select({ id: s.participacao.id })
      .from(s.participacao)
      .where(and(eq(s.participacao.formacaoId, formacaoId), eq(s.participacao.servidorId, servidorId)))
      .limit(1);
    if (ja.length) throw new ErroNegocio(`${sv.nomeCompleto} já está vinculado(a) a esta formação.`);
    await tx.insert(s.participacao).values({ formacaoId, servidorId, vinculadoPor: gestorId });
    await tx.insert(s.usuarioPortal).values({ servidorId }).onConflictDoNothing();
    const [conta] = await tx.select().from(s.usuarioPortal).where(eq(s.usuarioPortal.servidorId, servidorId)).limit(1);
    const instrucao = conta?.primeiroAcessoEm
      ? `Entre no portal com seu usuário e sua senha: ${link('/entrar')}`
      : `Como é seu primeiro acesso, ative sua conta em ${link('/primeiro-acesso')} — você vai precisar do seu CPF, deste e-mail e de um aplicativo autenticador no celular.`;
    await enfileirarEmail(
      sv.emailInstitucional,
      'Programa Formar: você foi vinculado(a) a uma formação',
      `Olá, ${primeiroNome(sv.nomeCompleto)}.\n\nVocê foi vinculado(a) à formação "${f.titulo}".\nNo portal do servidor você acompanha sua frequência e, ao final, baixa o certificado.\n\n${instrucao}`,
      tx
    );
    await auditar(
      {
        atorTipo: 'gestor',
        atorId: gestorId,
        acao: 'vincular',
        entidade: 'formacao',
        entidadeId: formacaoId,
        detalhes: { servidorId }
      },
      tx
    );
    return sv.nomeCompleto;
  });
}

export async function desvincularServidor(formacaoId: string, participacaoId: string, gestorId: string) {
  const d = await db();
  return d.transaction(async tx => {
    const f = await travarFormacao(tx, formacaoId);
    if (f.status === 'encerrada')
      throw new ErroNegocio('Não é possível remover participantes de uma formação encerrada.');
    const [p] = await tx
      .select({ id: s.participacao.id, nome: s.servidor.nomeCompleto, servidorId: s.servidor.id })
      .from(s.participacao)
      .innerJoin(s.servidor, eq(s.servidor.id, s.participacao.servidorId))
      .where(and(eq(s.participacao.id, participacaoId), eq(s.participacao.formacaoId, formacaoId)))
      .limit(1);
    if (!p) throw new ErroNegocio('Participante não encontrado.');
    await tx.delete(s.participacao).where(eq(s.participacao.id, participacaoId));
    await auditar(
      {
        atorTipo: 'gestor',
        atorId: gestorId,
        acao: 'desvincular',
        entidade: 'formacao',
        entidadeId: formacaoId,
        detalhes: { servidorId: p.servidorId }
      },
      tx
    );
    return p.nome;
  });
}

/** Marca o próximo encontro como realizado, com todos presentes. O gestor depois marca as faltas. */
export async function lancarProximoEncontro(formacaoId: string, gestorId: string) {
  const d = await db();
  return d.transaction(async tx => {
    await travarFormacao(tx, formacaoId);
    const [e] = await tx
      .select()
      .from(s.encontro)
      .where(and(eq(s.encontro.formacaoId, formacaoId), eq(s.encontro.realizado, false)))
      .orderBy(asc(s.encontro.ordem))
      .limit(1);
    if (!e) throw new ErroNegocio('Todos os encontros já foram lançados.');
    if (e.data > hojeISO())
      throw new ErroNegocio(
        `O encontro E${e.ordem} está agendado para ${dataBR(e.data)} e ainda não pode ser lançado.`
      );
    await tx
      .update(s.encontro)
      .set({ realizado: true, lancadoPor: gestorId, lancadoEm: new Date() })
      .where(eq(s.encontro.id, e.id));
    const parts = await tx
      .select({ id: s.participacao.id })
      .from(s.participacao)
      .where(eq(s.participacao.formacaoId, formacaoId));
    if (parts.length) {
      await tx
        .insert(s.presenca)
        .values(parts.map(p => ({ participacaoId: p.id, encontroId: e.id, presente: true, lancadoPor: gestorId })))
        .onConflictDoNothing();
    }
    await auditar(
      {
        atorTipo: 'gestor',
        atorId: gestorId,
        acao: 'lancar_encontro',
        entidade: 'formacao',
        entidadeId: formacaoId,
        detalhes: { ordem: e.ordem }
      },
      tx
    );
    await recalcular(tx, formacaoId, gestorId);
    return e.ordem;
  });
}

export async function definirPresenca(
  formacaoId: string,
  participacaoId: string,
  encontroId: string,
  presente: boolean,
  gestorId: string
) {
  const d = await db();
  await d.transaction(async tx => {
    await travarFormacao(tx, formacaoId);
    const [e] = await tx
      .select()
      .from(s.encontro)
      .where(and(eq(s.encontro.id, encontroId), eq(s.encontro.formacaoId, formacaoId)))
      .limit(1);
    const [p] = await tx
      .select({ id: s.participacao.id })
      .from(s.participacao)
      .where(and(eq(s.participacao.id, participacaoId), eq(s.participacao.formacaoId, formacaoId)))
      .limit(1);
    if (!e || !p) throw new ErroNegocio('Registro não encontrado.');
    if (!e.realizado) throw new ErroNegocio('Lance o encontro antes de registrar presenças.');
    await tx
      .insert(s.presenca)
      .values({ participacaoId, encontroId, presente, lancadoPor: gestorId })
      .onConflictDoUpdate({
        target: [s.presenca.participacaoId, s.presenca.encontroId],
        set: { presente, lancadoPor: gestorId, lancadoEm: new Date() }
      });
    await auditar(
      {
        atorTipo: 'gestor',
        atorId: gestorId,
        acao: presente ? 'marcar_presenca' : 'marcar_falta',
        entidade: 'participacao',
        entidadeId: participacaoId,
        detalhes: { encontro: e.ordem }
      },
      tx
    );
    await recalcular(tx, formacaoId, gestorId);
  });
}

export async function decidirConferencia(
  participacaoId: string,
  decisao: 'validar' | 'recusar',
  motivo: string | null,
  gestorId: string
) {
  const d = await db();
  return d.transaction(async tx => {
    const [p] = await tx.select().from(s.participacao).where(eq(s.participacao.id, participacaoId)).limit(1);
    if (!p) throw new ErroNegocio('Participação não encontrada.');
    await travarFormacao(tx, p.formacaoId);
    const [atual] = await tx.select().from(s.participacao).where(eq(s.participacao.id, participacaoId)).limit(1);
    if (atual.status !== 'em_conferencia') throw new ErroNegocio('Esta participação não está mais em conferência.');
    const [sv] = await tx.select().from(s.servidor).where(eq(s.servidor.id, p.servidorId)).limit(1);
    await tx
      .update(s.participacao)
      .set({
        status: decisao === 'validar' ? 'liberado_validado' : 'recusado',
        decididoPor: gestorId,
        decididoEm: new Date(),
        motivoRecusa: decisao === 'recusar' ? motivo || null : null
      })
      .where(eq(s.participacao.id, participacaoId));
    await auditar(
      { atorTipo: 'gestor', atorId: gestorId, acao: decisao, entidade: 'participacao', entidadeId: participacaoId },
      tx
    );
    await recalcular(tx, p.formacaoId, gestorId);
    if (decisao === 'recusar') {
      const [f] = await tx
        .select({ titulo: s.formacao.titulo })
        .from(s.formacao)
        .where(eq(s.formacao.id, p.formacaoId));
      await enfileirarEmail(
        sv.emailInstitucional,
        'Programa Formar: situação do seu certificado',
        `Olá, ${primeiroNome(sv.nomeCompleto)}.\n\nApós conferência, o certificado da formação "${f.titulo}" não foi emitido por frequência abaixo do mínimo.${motivo ? `\nObservação do núcleo de formação: ${motivo}` : ''}\n\nDúvidas? Fale com o núcleo de formação da SEMED.\n${link('/portal')}`,
        tx
      );
    }
    return sv.nomeCompleto;
  });
}

/* ------------------------------------------------------------------ */
/* Recalcular status e emitir/revogar certificados                       */
/* ------------------------------------------------------------------ */

async function travarFormacao(tx: Tx, formacaoId: string) {
  // SELECT … FOR UPDATE serializa alterações concorrentes na mesma formação.
  const [f] = await tx.select().from(s.formacao).where(eq(s.formacao.id, formacaoId)).for('update').limit(1);
  if (!f) throw new ErroNegocio('Formação não encontrada.');
  return f;
}

export async function recalcular(tx: Tx, formacaoId: string, atorId: string | null) {
  const [f] = await tx.select().from(s.formacao).where(eq(s.formacao.id, formacaoId)).limit(1);
  const encs = await tx
    .select()
    .from(s.encontro)
    .where(eq(s.encontro.formacaoId, formacaoId))
    .orderBy(asc(s.encontro.ordem));
  const n = encs.length;
  const realizadosIds = encs.filter(e => e.realizado).map(e => e.id);
  const st = statusFormacao(realizadosIds.length, n);
  if (st !== f.status) {
    await tx.update(s.formacao).set({ status: st, atualizadoEm: new Date() }).where(eq(s.formacao.id, formacaoId));
  }
  const encerrada = st === 'encerrada';
  const freqMin = Number(f.freqMinima);
  const total = f.cargaPresencialH + f.cargaEstudoH;
  const ultimaData = encs.length ? encs[encs.length - 1].data : hojeISO();

  const parts = await tx
    .select({ p: s.participacao, sv: s.servidor })
    .from(s.participacao)
    .innerJoin(s.servidor, eq(s.servidor.id, s.participacao.servidorId))
    .where(eq(s.participacao.formacaoId, formacaoId));

  for (const { p, sv } of parts) {
    const presentes = realizadosIds.length
      ? (
          await tx
            .select({ n: sql<number>`count(*)::int` })
            .from(s.presenca)
            .where(
              and(
                eq(s.presenca.participacaoId, p.id),
                eq(s.presenca.presente, true),
                inArray(s.presenca.encontroId, realizadosIds)
              )
            )
        )[0].n
      : 0;
    const novo = proximoStatus({
      encerrada,
      presencas: presentes,
      totalEncontros: n,
      atual: p.status,
      freqMinima: freqMin
    });
    if (novo !== p.status) {
      const limparDecisao = novo === 'em_andamento' || novo === 'em_conferencia' || novo === 'liberado_auto';
      await tx
        .update(s.participacao)
        .set(
          limparDecisao ? { status: novo, decididoPor: null, decididoEm: null, motivoRecusa: null } : { status: novo }
        )
        .where(eq(s.participacao.id, p.id));
      await auditar(
        {
          atorTipo: atorId ? 'gestor' : 'sistema',
          atorId,
          acao: 'status',
          entidade: 'participacao',
          entidadeId: p.id,
          detalhes: { de: p.status, para: novo }
        },
        tx
      );
    }

    const [ativo] = await tx
      .select()
      .from(s.certificado)
      .where(and(eq(s.certificado.participacaoId, p.id), isNull(s.certificado.revogadoEm)))
      .limit(1);
    const horas = cargaCumprida(total, presentes, n);
    const freq = frequenciaPct(presentes, n);

    if (certificadoLiberado(novo)) {
      if (ativo && ativo.cargaCumpridaH === horas && ativo.frequenciaPct === freq) continue;
      if (ativo) await revogar(tx, ativo.id, 'Reemitido após correção de presença', atorId);
      const dataEmissao = novo === 'liberado_validado' ? hojeISO() : ultimaData;
      const codigo = await novoCodigo(tx, f.prefixoCodigo, formacaoId, Number(dataEmissao.slice(0, 4)));
      const [c] = await tx
        .insert(s.certificado)
        .values({
          participacaoId: p.id,
          codigoValidacao: codigo,
          cargaCumpridaH: horas,
          frequenciaPct: freq,
          dataEmissao
        })
        .returning({ id: s.certificado.id });
      await auditar(
        {
          atorTipo: atorId ? 'gestor' : 'sistema',
          atorId,
          acao: 'emitir',
          entidade: 'certificado',
          entidadeId: c.id,
          detalhes: { codigo }
        },
        tx
      );
      await enfileirarEmail(
        sv.emailInstitucional,
        ativo ? 'Programa Formar: certificado atualizado' : 'Programa Formar: seu certificado está disponível',
        `Olá, ${primeiroNome(sv.nomeCompleto)}.\n\n${ativo ? 'Seu certificado foi reemitido após uma correção de presença' : 'Seu certificado já está disponível'}: "${f.titulo}" (${horas}h).\nBaixe no portal do servidor: ${link('/portal/certificados')}\n\nCódigo de validação: ${codigo}`,
        tx
      );
    } else if (ativo) {
      await revogar(tx, ativo.id, encerrada ? 'Frequência recalculada abaixo do mínimo' : 'Formação reaberta', atorId);
    }
  }
}

async function revogar(tx: Tx, certificadoId: string, motivo: string, atorId: string | null) {
  await tx
    .update(s.certificado)
    .set({ revogadoEm: new Date(), motivoRevogacao: motivo })
    .where(eq(s.certificado.id, certificadoId));
  await auditar(
    {
      atorTipo: atorId ? 'gestor' : 'sistema',
      atorId,
      acao: 'revogar',
      entidade: 'certificado',
      entidadeId: certificadoId,
      detalhes: { motivo }
    },
    tx
  );
}

async function novoCodigo(tx: Tx, prefixo: string, formacaoId: string, ano: number) {
  const [r] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(s.certificado)
    .innerJoin(s.participacao, eq(s.participacao.id, s.certificado.participacaoId))
    .where(eq(s.participacao.formacaoId, formacaoId));
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = codigoValidacao(ano, prefixo, (r?.n ?? 0) + 1 + tentativa, randomBytes(5));
    const existe = await tx
      .select({ id: s.certificado.id })
      .from(s.certificado)
      .where(eq(s.certificado.codigoValidacao, codigo))
      .limit(1);
    if (!existe.length) return codigo;
  }
  throw new Error('Não foi possível gerar um código de validação único.');
}

/* ------------------------------------------------------------------ */
/* Portal do servidor                                                   */
/* ------------------------------------------------------------------ */

export async function formacoesDoServidor(servidorId: string) {
  const d = await db();
  const parts = await d
    .select({ formacaoId: s.participacao.formacaoId })
    .from(s.participacao)
    .where(eq(s.participacao.servidorId, servidorId));
  const out = [];
  for (const { formacaoId } of parts) {
    const det = await obterFormacao(formacaoId);
    if (!det) continue;
    const eu = det.participantes.find(p => p.servidorId === servidorId);
    if (!eu) continue;
    out.push({ det, eu });
  }
  return out.sort((a, b) => (a.det.periodo < b.det.periodo ? 1 : -1));
}

/** Certificado do próprio servidor (nunca de outra pessoa). */
export async function certificadoDoServidor(certificadoId: string, servidorId: string) {
  const d = await db();
  const [r] = await d
    .select({ c: s.certificado, p: s.participacao })
    .from(s.certificado)
    .innerJoin(s.participacao, eq(s.participacao.id, s.certificado.participacaoId))
    .where(
      and(
        eq(s.certificado.id, certificadoId),
        eq(s.participacao.servidorId, servidorId),
        isNull(s.certificado.revogadoEm)
      )
    )
    .limit(1);
  return r ?? null;
}

/** Validação pública: só os dados necessários para conferir a autenticidade. */
export async function validarCodigoPublico(codigo: string) {
  const d = await db();
  const [r] = await d
    .select({
      codigo: s.certificado.codigoValidacao,
      revogadoEm: s.certificado.revogadoEm,
      dataEmissao: s.certificado.dataEmissao,
      horas: s.certificado.cargaCumpridaH,
      nome: s.servidor.nomeCompleto,
      formacao: s.formacao.titulo,
      formacaoId: s.formacao.id,
      cargaTotal: sql<number>`(${s.formacao.cargaPresencialH} + ${s.formacao.cargaEstudoH})::int`
    })
    .from(s.certificado)
    .innerJoin(s.participacao, eq(s.participacao.id, s.certificado.participacaoId))
    .innerJoin(s.servidor, eq(s.servidor.id, s.participacao.servidorId))
    .innerJoin(s.formacao, eq(s.formacao.id, s.participacao.formacaoId))
    .where(eq(s.certificado.codigoValidacao, codigo))
    .limit(1);
  if (!r) return null;
  const encs = await d
    .select({ data: s.encontro.data })
    .from(s.encontro)
    .where(eq(s.encontro.formacaoId, r.formacaoId));
  return { ...r, periodo: periodo(encs.map(e => e.data)) };
}

/* ------------------------------------------------------------------ */
/* Correções (gestão e administração)                                   */
/* ------------------------------------------------------------------ */

/** Edita data e módulo de um encontro. Encontro já realizado: só o administrador. */
export async function editarEncontro(
  formacaoId: string,
  encontroId: string,
  data: string,
  modulo: string,
  gestor: { id: string; perfil: 'gestor_nucleo' | 'admin' }
) {
  const d = await db();
  await d.transaction(async tx => {
    await travarFormacao(tx, formacaoId);
    const encs = await tx
      .select()
      .from(s.encontro)
      .where(eq(s.encontro.formacaoId, formacaoId))
      .orderBy(asc(s.encontro.ordem));
    const i = encs.findIndex(e => e.id === encontroId);
    if (i < 0) throw new ErroNegocio('Encontro não encontrado.');
    const e = encs[i];
    if (e.realizado && gestor.perfil !== 'admin')
      throw new ErroNegocio('Encontros já realizados só podem ser corrigidos pelo administrador.');
    if (i > 0 && data < encs[i - 1].data)
      throw new ErroNegocio(
        `A data não pode ser anterior ao encontro E${encs[i - 1].ordem} (${dataBR(encs[i - 1].data)}).`
      );
    if (i < encs.length - 1 && data > encs[i + 1].data)
      throw new ErroNegocio(
        `A data não pode ser posterior ao encontro E${encs[i + 1].ordem} (${dataBR(encs[i + 1].data)}).`
      );
    if (e.realizado && data > hojeISO()) throw new ErroNegocio('Um encontro já realizado não pode ter data futura.');
    await tx.update(s.encontro).set({ data, modulo }).where(eq(s.encontro.id, encontroId));
    await auditar(
      {
        atorTipo: 'gestor',
        atorId: gestor.id,
        acao: 'editar_encontro',
        entidade: 'formacao',
        entidadeId: formacaoId,
        detalhes: { ordem: e.ordem, de: { data: e.data, modulo: e.modulo }, para: { data, modulo } }
      },
      tx
    );
  });
}

/** Administrador: volta o último encontro lançado para "agendado" e apaga as presenças dele. */
export async function desfazerUltimoLancamento(formacaoId: string, adminId: string) {
  const d = await db();
  return d.transaction(async tx => {
    await travarFormacao(tx, formacaoId);
    const [e] = await tx
      .select()
      .from(s.encontro)
      .where(and(eq(s.encontro.formacaoId, formacaoId), eq(s.encontro.realizado, true)))
      .orderBy(sql`${s.encontro.ordem} desc`)
      .limit(1);
    if (!e) throw new ErroNegocio('Nenhum encontro lançado para desfazer.');
    const pres = await tx.select().from(s.presenca).where(eq(s.presenca.encontroId, e.id));
    await tx.delete(s.presenca).where(eq(s.presenca.encontroId, e.id));
    await tx
      .update(s.encontro)
      .set({ realizado: false, lancadoPor: null, lancadoEm: null })
      .where(eq(s.encontro.id, e.id));
    await auditar(
      {
        atorTipo: 'gestor',
        atorId: adminId,
        acao: 'desfazer_lancamento',
        entidade: 'formacao',
        entidadeId: formacaoId,
        detalhes: { ordem: e.ordem, presencasApagadas: pres.length, faltas: pres.filter(p => !p.presente).length }
      },
      tx
    );
    await recalcular(tx, formacaoId, adminId);
    return e.ordem;
  });
}

/** Administrador: exclui formação que nunca emitiu certificado. */
export async function excluirFormacao(formacaoId: string, adminId: string) {
  const d = await db();
  return d.transaction(async tx => {
    const f = await travarFormacao(tx, formacaoId);
    const [c] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(s.certificado)
      .innerJoin(s.participacao, eq(s.participacao.id, s.certificado.participacaoId))
      .where(eq(s.participacao.formacaoId, formacaoId));
    if (c.n > 0)
      throw new ErroNegocio(
        'Esta formação já emitiu certificados e não pode ser excluída (o histórico precisa ser preservado).'
      );
    await tx.delete(s.formacao).where(eq(s.formacao.id, formacaoId));
    await auditar(
      {
        atorTipo: 'gestor',
        atorId: adminId,
        acao: 'excluir_formacao',
        entidade: 'formacao',
        entidadeId: formacaoId,
        detalhes: { titulo: f.titulo }
      },
      tx
    );
    return f.titulo;
  });
}
