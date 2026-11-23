import 'server-only';
import type { DadosCertificado } from '@/components/certificado/CertificadoPreview';
import { env } from '@/lib/env';
import { hojeISO } from './datas';
import { cargaCumprida, dataBR, dataExtenso, parseConteudo } from './regras';
import type { DetalheFormacao, LinhaParticipante } from './servico';

const ASSINATURAS_PADRAO = [
  { nome: 'Secretário(a) Municipal de Educação', cargo: 'Secretaria Municipal de Educação' },
  { nome: 'Prefeito(a) de Serra Clara', cargo: 'Prefeitura de Serra Clara' }
];

/** Monta as variáveis do certificado de um participante (ou um exemplo, sem participante). */
export function dadosCertificado(det: DetalheFormacao, p?: LinhaParticipante | null): DadosCertificado {
  const f = det.formacao;
  const n = det.totalEncontros;
  const presencas = p ? p.totalPresencas : n;
  const dataIso = p?.certificado?.dataEmissao ?? det.encontros.at(-1)?.data ?? hojeISO();
  return {
    nome: p?.nome ?? 'Nome Completo do Servidor',
    formacao: f.titulo,
    cargaTotal: det.cargaTotal,
    cargaCumprida: p ? p.cargaCumprida : det.cargaTotal,
    cargaPresencial: f.cargaPresencialH,
    cargaEstudo: f.cargaEstudoH,
    presencialCumprida: cargaCumprida(f.cargaPresencialH, presencas, n),
    estudoCumprida: cargaCumprida(f.cargaEstudoH, presencas, n),
    cidade: det.modelo?.cidade ?? 'Serra Clara',
    dataExtenso: dataExtenso(dataIso),
    dataEmissaoBR: dataBR(dataIso),
    assinaturas: det.modelo?.assinaturas ?? ASSINATURAS_PADRAO,
    modulos: parseConteudo(f.conteudoProgramatico),
    codigo: p?.certificado?.codigo ?? `PNL-${dataIso.slice(0, 4)}-${f.prefixoCodigo}-0000-XXXXX`,
    urlValidacao: new URL('/validar', env().SITE_URL).host + '/validar'
  };
}
