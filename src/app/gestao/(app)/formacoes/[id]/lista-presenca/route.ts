import { exigirGestor } from '@/lib/auth/sessao';
import { auditar } from '@/lib/auditoria';
import { obterFormacao } from '@/lib/dominio/servico';
import { gerarListaPresenca } from '@/lib/pdf/lista-presenca';
import { respostaPdf } from '@/lib/pdf/resposta';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_: Request, ctx: RouteContext<'/gestao/formacoes/[id]/lista-presenca'>) {
  const g = await exigirGestor();
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response('Não encontrado', { status: 404 });
  const det = await obterFormacao(id);
  if (!det) return new Response('Não encontrado', { status: 404 });
  const bytes = await gerarListaPresenca(det);
  await auditar({ atorTipo: 'gestor', atorId: g.id, acao: 'imprimir_lista', entidade: 'formacao', entidadeId: id });
  return respostaPdf(bytes, `Lista_presenca_${det.formacao.tituloCurto.replace(/\s+/g, '')}.pdf`, false);
}
