import { exigirGestor } from '@/lib/auth/sessao';
import { auditar } from '@/lib/auditoria';
import { pdfDoCertificado, respostaPdf } from '@/lib/pdf/resposta';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_: Request, ctx: RouteContext<'/gestao/certificados/[id]/pdf'>) {
  const g = await exigirGestor();
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response('Não encontrado', { status: 404 });
  const r = await pdfDoCertificado(id);
  if (!r) return new Response('Certificado não encontrado', { status: 404 });
  await auditar({ atorTipo: 'gestor', atorId: g.id, acao: 'ver_pdf', entidade: 'certificado', entidadeId: id });
  return respostaPdf(r.bytes, r.arquivo, false);
}
