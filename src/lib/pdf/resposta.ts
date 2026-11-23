import 'server-only';
import { eq } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { dadosCertificado } from '@/lib/dominio/certificado-dados';
import { nomeArquivoCertificado } from '@/lib/dominio/regras';
import { obterFormacao } from '@/lib/dominio/servico';
import { gerarPdfCertificado } from './certificado';

export function respostaPdf(bytes: Uint8Array, arquivo: string, baixar: boolean) {
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${baixar ? 'attachment' : 'inline'}; filename="${arquivo.replace(/[^\w.-]/g, '_')}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

/** Gera o PDF de um certificado ativo. Quem chama já conferiu a permissão. */
export async function pdfDoCertificado(certificadoId: string) {
  const d = await db();
  const [c] = await d
    .select({ cert: s.certificado, formacaoId: s.participacao.formacaoId })
    .from(s.certificado)
    .innerJoin(s.participacao, eq(s.participacao.id, s.certificado.participacaoId))
    .where(eq(s.certificado.id, certificadoId))
    .limit(1);
  if (!c || c.cert.revogadoEm) return null;
  const det = await obterFormacao(c.formacaoId);
  const p = det?.participantes.find(x => x.participacaoId === c.cert.participacaoId);
  if (!det || !p) return null;
  const dados = dadosCertificado(det, {
    ...p,
    certificado: { id: c.cert.id, codigo: c.cert.codigoValidacao, dataEmissao: c.cert.dataEmissao }
  });
  // Os valores emitidos (carga e frequência) são os do certificado, não os atuais.
  dados.cargaCumprida = c.cert.cargaCumpridaH;
  const bytes = await gerarPdfCertificado(dados);
  return { bytes, arquivo: nomeArquivoCertificado(p.nome, det.formacao.tituloCurto, c.cert.cargaCumpridaH) };
}
