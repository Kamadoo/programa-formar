import { exigirServidor } from '@/lib/auth/sessao';
import { auditar } from '@/lib/auditoria';
import { certificadoDoServidor } from '@/lib/dominio/servico';
import { pdfDoCertificado, respostaPdf } from '@/lib/pdf/resposta';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_: Request, ctx: RouteContext<'/portal/certificados/[id]/pdf'>) {
  const s = await exigirServidor();
  const { id } = await ctx.params;
  // O certificado precisa ser do próprio servidor — senão, 404 (sem revelar se existe).
  if (!UUID.test(id) || !(await certificadoDoServidor(id, s.id)))
    return new Response('Não encontrado', { status: 404 });
  const r = await pdfDoCertificado(id);
  if (!r) return new Response('Não encontrado', { status: 404 });
  await auditar({ atorTipo: 'servidor', atorId: s.id, acao: 'baixar_pdf', entidade: 'certificado', entidadeId: id });
  return respostaPdf(r.bytes, r.arquivo, true);
}
