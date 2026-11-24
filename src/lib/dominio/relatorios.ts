import 'server-only';
import { and, asc, inArray, isNull } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { periodo } from './regras';

export type Situacao = 'todas' | 'encerrada' | 'em_andamento' | 'planejada';

export type LinhaRelatorio = {
  id: string;
  titulo: string;
  programaEixo: string;
  formador: string;
  status: 'planejada' | 'em_andamento' | 'encerrada';
  periodo: string;
  encontros: number;
  realizados: number;
  cargaTotal: number;
  /** Carga da formação proporcional aos encontros já realizados (encerrada = carga total). */
  horasExecutadas: number;
  participantes: number;
  certificados: number;
  /** Soma das cargas dos certificados emitidos (horas certificadas aos servidores). */
  horasCertificadas: number;
};

export type Relatorio = {
  ano: number | null;
  situacao: Situacao;
  anos: number[];
  linhas: LinhaRelatorio[];
  totais: {
    formacoes: number;
    encerradas: number;
    horasExecutadas: number;
    participacoes: number;
    servidores: number;
    certificados: number;
    horasCertificadas: number;
  };
};

/**
 * Relatório de formações da gestão: cursos realizados, horas executadas, participantes e certificados emitidos.
 * O ano de uma formação é o do primeiro encontro (sem encontros: o ano do cadastro).
 */
export async function relatorioFormacoes(filtro: { ano: number | null; situacao: Situacao }): Promise<Relatorio> {
  const d = await db();
  const forms = await d.select().from(s.formacao).orderBy(asc(s.formacao.titulo));
  const ids = forms.map(f => f.id);
  const encs = ids.length
    ? await d
        .select({ formacaoId: s.encontro.formacaoId, data: s.encontro.data, realizado: s.encontro.realizado })
        .from(s.encontro)
        .where(inArray(s.encontro.formacaoId, ids))
    : [];
  const parts = ids.length
    ? await d
        .select({ id: s.participacao.id, formacaoId: s.participacao.formacaoId, servidorId: s.participacao.servidorId })
        .from(s.participacao)
        .where(inArray(s.participacao.formacaoId, ids))
    : [];
  const pids = parts.map(p => p.id);
  const certs = pids.length
    ? await d
        .select({ participacaoId: s.certificado.participacaoId, carga: s.certificado.cargaCumpridaH })
        .from(s.certificado)
        .where(and(inArray(s.certificado.participacaoId, pids), isNull(s.certificado.revogadoEm)))
    : [];

  const anoDe = (f: (typeof forms)[number]) => {
    const datas = encs
      .filter(e => e.formacaoId === f.id)
      .map(e => e.data)
      .sort();
    return Number((datas[0] ?? f.criadoEm.toISOString()).slice(0, 4));
  };
  const anos = [...new Set(forms.map(anoDe))].sort((a, b) => b - a);

  const linhas: LinhaRelatorio[] = [];
  const servidores = new Set<string>();
  for (const f of forms) {
    if (filtro.ano && anoDe(f) !== filtro.ano) continue;
    if (filtro.situacao !== 'todas' && f.status !== filtro.situacao) continue;
    const e = encs.filter(x => x.formacaoId === f.id);
    const realizados = e.filter(x => x.realizado).length;
    const p = parts.filter(x => x.formacaoId === f.id);
    const pset = new Set(p.map(x => x.id));
    const c = certs.filter(x => pset.has(x.participacaoId));
    const cargaTotal = f.cargaPresencialH + f.cargaEstudoH;
    for (const x of p) servidores.add(x.servidorId);
    linhas.push({
      id: f.id,
      titulo: f.titulo,
      programaEixo: f.programaEixo,
      formador: f.formador,
      status: f.status,
      periodo: periodo(e.map(x => x.data)),
      encontros: e.length,
      realizados,
      cargaTotal,
      horasExecutadas: e.length ? Math.round((cargaTotal * realizados) / e.length) : 0,
      participantes: p.length,
      certificados: c.length,
      horasCertificadas: c.reduce((t, x) => t + x.carga, 0)
    });
  }
  const soma = (k: 'horasExecutadas' | 'participantes' | 'certificados' | 'horasCertificadas') =>
    linhas.reduce((t, l) => t + l[k], 0);
  return {
    ano: filtro.ano,
    situacao: filtro.situacao,
    anos,
    linhas,
    totais: {
      formacoes: linhas.length,
      encerradas: linhas.filter(l => l.status === 'encerrada').length,
      horasExecutadas: soma('horasExecutadas'),
      participacoes: soma('participantes'),
      servidores: servidores.size,
      certificados: soma('certificados'),
      horasCertificadas: soma('horasCertificadas')
    }
  };
}

const SITUACOES: Situacao[] = ['todas', 'encerrada', 'em_andamento', 'planejada'];

/** Lê os filtros da URL (?ano=2026&situacao=encerrada) com valores seguros. */
export function filtroRelatorio(q: { ano?: string | string[]; situacao?: string | string[] }) {
  const a = Number(typeof q.ano === 'string' ? q.ano : NaN);
  const sit =
    typeof q.situacao === 'string' && SITUACOES.includes(q.situacao as Situacao) ? (q.situacao as Situacao) : 'todas';
  return { ano: Number.isInteger(a) && a >= 2000 && a <= 2100 ? a : null, situacao: sit };
}

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  todas: 'Todas as situações',
  encerrada: 'Encerradas',
  em_andamento: 'Em andamento',
  planejada: 'Planejadas'
};
