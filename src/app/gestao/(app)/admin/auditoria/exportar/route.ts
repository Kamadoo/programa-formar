import ExcelJS from 'exceljs';
import { exigirAdmin } from '@/lib/auth/sessao';
import { auditar } from '@/lib/auditoria';
import { consultarAuditoria, resumoDetalhes } from '@/lib/dominio/auditoria-consulta';
import { dataHoraBR, hojeISO } from '@/lib/dominio/datas';

const LIMITE = 50_000;

export async function GET(req: Request) {
  const adm = await exigirAdmin();
  const sp = new URL(req.url).searchParams;
  const filtro = {
    de: sp.get('de') ?? undefined,
    ate: sp.get('ate') ?? undefined,
    atorTipo: sp.get('tipo') ?? undefined,
    atorId: sp.get('pessoa') ?? undefined,
    acao: sp.get('acao') ?? undefined
  };
  const r = await consultarAuditoria({ ...filtro, pagina: 1 }, LIMITE);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Programa Formar';
  const ws = wb.addWorksheet('Auditoria');
  ws.columns = [
    { header: 'Quando', key: 'quando', width: 18 },
    { header: 'Tipo', key: 'tipo', width: 12 },
    { header: 'Quem', key: 'quem', width: 32 },
    { header: 'Ação', key: 'acao', width: 36 },
    { header: 'Registro', key: 'entidade', width: 16 },
    { header: 'Detalhes', key: 'detalhes', width: 70 }
  ];
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  for (const l of r.linhas) {
    ws.addRow({
      quando: dataHoraBR(l.em),
      tipo: l.atorTipo,
      quem: l.ator,
      acao: l.acaoTexto,
      entidade: l.entidade,
      detalhes: resumoDetalhes(l.detalhes)
    });
  }
  await auditar({
    atorTipo: 'gestor',
    atorId: adm.id,
    acao: 'exportar_auditoria',
    entidade: 'auditoria',
    detalhes: { linhas: r.linhas.length, ...filtro }
  });
  const buf = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="auditoria-${hojeISO()}.xlsx"`,
      'Cache-Control': 'private, no-store'
    }
  });
}
