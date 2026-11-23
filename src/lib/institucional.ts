/**
 * Dados institucionais usados nas páginas de Privacidade, Termos de uso e no security.txt.
 * Fonte: documentos oficiais publicados pelo Município (conferir com a SEMED antes de mudar).
 */
export const INSTITUCIONAL = {
  municipio: 'Município de Serra Clara',
  orgao: 'Secretaria Municipal de Educação de Serra Clara (SEMED)',
  controlador: 'Secretaria Municipal de Educação de Serra Clara (SEMED), órgão do Município de Serra Clara',
  /** CNPJ da própria SEMED (informado pela Secretaria). */
  cnpj: '00.000.000/0001-00',
  enderecoSemed: 'Rua das Palmeiras, 100, Centro, Serra Clara, CEP 00000-000',
  /** Atendimento do Programa Formar (encaminhado pela Cloudflare Email Routing). */
  emailAtendimento: 'contato@programaformar.example',
  /** Encarregado de dados do Município: preencher quando a Prefeitura informar (art. 41 da LGPD). */
  encarregado: { nome: null as string | null, email: null as string | null },
  /** Data da última revisão dos textos de Privacidade e Termos. */
  atualizadoEm: '18 de novembro de 2026'
} as const;
