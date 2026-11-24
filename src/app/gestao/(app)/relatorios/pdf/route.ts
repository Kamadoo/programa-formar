import { exigirGestor } from '@/lib/auth/sessao';
import { auditar } from '@/lib/auditoria';
import { hojeISO } from '@/lib/dominio/datas';
import { filtroRelatorio, relatorioFormacoes } from '@/lib/dominio/relatorios';
import { gerarPdfRelatorio } from '@/lib/pdf/relatorio';
import { respostaPdf } from '@/lib/pdf/resposta';

/** Relatório de formações em PDF (A4 paisagem) para imprimir, com os mesmos filtros da tela. */
export async function GET(req: Request) {
  const g = await exigirGestor();
  const u = new URL(req.url).searchParams;
  const filtro = filtroRelatorio({ ano: u.get('ano') ?? undefined, situacao: u.get('situacao') ?? undefined });
  const r = await relatorioFormacoes(filtro);
  const bytes = await gerarPdfRelatorio(r, g.nome);
  await auditar({
    atorTipo: 'gestor',
    atorId: g.id,
    acao: 'imprimir_relatorio',
    entidade: 'relatorio',
    detalhes: filtro
  });
  return respostaPdf(bytes, `Relatorio_formacoes_${r.ano ?? 'todos'}_${hojeISO()}.pdf`, false);
}
