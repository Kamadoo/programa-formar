import 'server-only';
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { hashCpf } from '@/lib/cripto';
import { enfileirarConvite } from '@/lib/email';
import { normalizarBusca, somenteDigitos } from './regras';
import { emailConvidavel, situacaoDoEmail, type FiltrosConvite, type SituacaoConvite } from './convites-filtros';

export const POR_PAGINA_CONVITES = 100;

/**
 * Situação do último convite de cada servidor, calculada no banco.
 * Convite sem e-mail na fila (já limpo pela LGPD, ou endereço fictício) conta como enviado.
 */
const situacaoSql = sql<SituacaoConvite>`coalesce((
  select case
    when e.id is null or e.enviado_em is not null then 'enviado'
    when e.desistiu_em is not null then 'falhou'
    else 'na_fila' end
  from convite_servidor c left join email_saida e on e.id = c.email_id
  where c.servidor_id = ${s.servidor.id}
  order by c.criado_em desc limit 1), 'nunca')`;
const ultimoSql = sql<Date | null>`(select max(c.criado_em) from convite_servidor c where c.servidor_id = ${s.servidor.id})`;
const enviosSql = sql<number>`(select count(*)::int from convite_servidor c where c.servidor_id = ${s.servidor.id})`;
const criadoSql = sql<Date>`coalesce(${s.servidor.importadoEm}, ${s.servidor.atualizadoEm})`;

/** Ativos, fora das contas de teste e que ainda não concluíram o primeiro acesso ao portal. */
function pendentes(): SQL {
  return and(eq(s.servidor.ativo, true), isNull(s.servidor.testeAte), isNull(s.usuarioPortal.primeiroAcessoEm))!;
}

function condicoes(f: FiltrosConvite): SQL {
  const cond: SQL[] = [pendentes()];
  if (f.q.length >= 2) {
    const dig = somenteDigitos(f.q);
    const termo = normalizarBusca(f.q).replace(/[%_\\]/g, '');
    const ou: SQL[] = [ilike(s.servidor.nomeBusca, `%${termo}%`), ilike(s.servidor.emailInstitucional, `%${termo}%`)];
    if (dig.length >= 2) ou.push(ilike(s.servidor.matricula, `${dig}%`));
    if (dig.length === 11) ou.push(eq(s.servidor.cpfHash, hashCpf(dig)));
    cond.push(or(...ou)!);
  }
  if (f.lotacao === '-') cond.push(sql`coalesce(${s.servidor.lotacao}, '') = ''`);
  else if (f.lotacao) cond.push(eq(s.servidor.lotacao, f.lotacao));
  if (f.funcao === '-') cond.push(sql`coalesce(${s.servidor.funcao}, '') = ''`);
  else if (f.funcao) cond.push(eq(s.servidor.funcao, f.funcao));
  if (f.convite === 'enviado7') cond.push(sql`${situacaoSql} = 'enviado' and ${ultimoSql} < now() - interval '7 days'`);
  else if (f.convite !== 'todos') cond.push(sql`${situacaoSql} = ${f.convite}`);
  if (f.criacao === '7') cond.push(sql`${criadoSql} >= now() - interval '7 days'`);
  else if (f.criacao === '30') cond.push(sql`${criadoSql} >= now() - interval '30 days'`);
  else if (f.criacao === 'mais30') cond.push(sql`${criadoSql} < now() - interval '30 days'`);
  return and(...cond)!;
}

export type ContaPendente = {
  id: string;
  nome: string;
  email: string;
  matricula: string;
  funcao: string | null;
  lotacao: string | null;
  criadoEm: Date;
  situacao: SituacaoConvite;
  envios: number;
  ultimoEnvio: Date | null;
  emailValido: boolean;
};

/** Lista paginada das contas que aguardam o primeiro acesso, com os filtros da tela. */
export async function listarPendentes(f: FiltrosConvite) {
  const d = await db();
  const onde = condicoes(f);
  const base = () =>
    d
      .select({ total: sql<number>`count(*)::int` })
      .from(s.servidor)
      .leftJoin(s.usuarioPortal, eq(s.usuarioPortal.servidorId, s.servidor.id));
  const [{ total }] = await base().where(onde);
  const [{ total: totalPendentes }] = await base().where(pendentes());
  const linhas = await d
    .select({
      id: s.servidor.id,
      nome: s.servidor.nomeCompleto,
      email: s.servidor.emailInstitucional,
      matricula: s.servidor.matricula,
      funcao: s.servidor.funcao,
      lotacao: s.servidor.lotacao,
      criadoEm: criadoSql,
      situacao: situacaoSql,
      envios: enviosSql,
      ultimoEnvio: ultimoSql
    })
    .from(s.servidor)
    .leftJoin(s.usuarioPortal, eq(s.usuarioPortal.servidorId, s.servidor.id))
    .where(onde)
    .orderBy(asc(s.servidor.nomeCompleto))
    .limit(POR_PAGINA_CONVITES)
    .offset((f.pagina - 1) * POR_PAGINA_CONVITES);
  const lista: ContaPendente[] = linhas.map(l => ({
    ...l,
    // O driver pode devolver datas de subconsultas como texto.
    criadoEm: new Date(l.criadoEm),
    ultimoEnvio: l.ultimoEnvio ? new Date(l.ultimoEnvio) : null,
    emailValido: emailConvidavel(l.email)
  }));
  return { lista, total, totalPendentes };
}

/** Lotações e funções de quem está pendente, para os filtros. */
export async function opcoesFiltros() {
  const d = await db();
  const de = (col: typeof s.servidor.lotacao | typeof s.servidor.funcao) =>
    d
      .selectDistinct({ v: col })
      .from(s.servidor)
      .leftJoin(s.usuarioPortal, eq(s.usuarioPortal.servidorId, s.servidor.id))
      .where(pendentes())
      .orderBy(asc(col));
  const [lot, fun] = await Promise.all([de(s.servidor.lotacao), de(s.servidor.funcao)]);
  const limpar = (r: { v: string | null }[]) => ({
    valores: r.map(x => x.v).filter((v): v is string => Boolean(v && v.trim())),
    temVazio: r.some(x => !x.v || !x.v.trim())
  });
  return { lotacoes: limpar(lot), funcoes: limpar(fun) };
}

export type ResumoEnvio = { enviados: number; jaEnviados: number; naFila: number; indisponiveis: number };

/**
 * Libera o acesso ao portal (se ainda não houver conta) e enfileira o convite de cada servidor escolhido.
 * Quem já recebeu só recebe de novo com `reenviar`; quem tem convite ainda na fila nunca recebe outro.
 */
export async function enviarConvites(adminId: string, ids: string[], reenviar: boolean): Promise<ResumoEnvio> {
  const unicos = [...new Set(ids)];
  const d = await db();
  return d.transaction(async tx => {
    // Dois administradores enviando ao mesmo tempo não geram convites em dobro.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('formar_convites_portal'))`);
    const pessoas = await tx
      .select({
        id: s.servidor.id,
        nome: s.servidor.nomeCompleto,
        email: s.servidor.emailInstitucional,
        ativo: s.servidor.ativo,
        testeAte: s.servidor.testeAte,
        primeiroAcessoEm: s.usuarioPortal.primeiroAcessoEm
      })
      .from(s.servidor)
      .leftJoin(s.usuarioPortal, eq(s.usuarioPortal.servidorId, s.servidor.id))
      .where(inArray(s.servidor.id, unicos));
    const anteriores = await tx
      .select({
        servidorId: s.conviteServidor.servidorId,
        emailId: s.conviteServidor.emailId,
        filaId: s.emailSaida.id,
        enviadoEm: s.emailSaida.enviadoEm,
        desistiuEm: s.emailSaida.desistiuEm
      })
      .from(s.conviteServidor)
      .leftJoin(s.emailSaida, eq(s.emailSaida.id, s.conviteServidor.emailId))
      .where(inArray(s.conviteServidor.servidorId, unicos))
      .orderBy(desc(s.conviteServidor.criadoEm));
    const situacoes = new Map<string, SituacaoConvite[]>();
    for (const a of anteriores) {
      const sit = situacaoDoEmail({ existe: Boolean(a.filaId), enviadoEm: a.enviadoEm, desistiuEm: a.desistiuEm });
      situacoes.set(a.servidorId, [...(situacoes.get(a.servidorId) ?? []), sit]);
    }

    const r: ResumoEnvio = { enviados: 0, jaEnviados: 0, naFila: 0, indisponiveis: 0 };
    for (const id of unicos) {
      const p = pessoas.find(x => x.id === id);
      if (!p || !p.ativo || p.testeAte || p.primeiroAcessoEm || !emailConvidavel(p.email)) {
        r.indisponiveis++;
        continue;
      }
      const sits = situacoes.get(id) ?? [];
      if (sits[0] === 'na_fila') {
        r.naFila++;
        continue;
      }
      const jaRecebeu = sits.includes('enviado');
      if (jaRecebeu && !reenviar) {
        r.jaEnviados++;
        continue;
      }
      await tx.insert(s.usuarioPortal).values({ servidorId: id }).onConflictDoNothing();
      const emailId = await enfileirarConvite(p.email.trim(), p.nome, tx);
      await tx
        .insert(s.conviteServidor)
        .values({ servidorId: id, enviadoPor: adminId, emailId, reenvio: sits.length > 0 });
      r.enviados++;
    }
    return r;
  });
}
