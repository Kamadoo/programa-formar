import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { gestorAtual, servidorAtual } from '@/lib/auth/sessao';

/**
 * Arte de fundo do certificado (com as assinaturas eletrônicas) para a prévia em tela.
 * Só para quem está conectado (gestão ou portal): a imagem não fica pública em /public.
 */
export async function GET(_: Request, { params }: RouteContext<'/certificado-fundo/[lado]'>) {
  const { lado } = await params;
  if (lado !== 'frente' && lado !== 'verso') return new Response('Não encontrado', { status: 404 });
  if (!(await gestorAtual()) && !(await servidorAtual())) return new Response('Não autorizado', { status: 401 });
  // Caminhos literais: o build inclui só estes arquivos no pacote do servidor.
  const bytes =
    lado === 'frente'
      ? await readFile(path.join(process.cwd(), 'assets', 'certificado', 'previa-frente.jpg'))
      : await readFile(path.join(process.cwd(), 'assets', 'certificado', 'previa-verso.jpg'));
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' }
  });
}
