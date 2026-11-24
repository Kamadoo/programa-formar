/** Regras puras dos convites de primeiro acesso (testadas em tests/unit). */

/** Quantos convites podem sair num único envio. */
export const MAX_CONVITES_POR_ENVIO = 100;

export type SituacaoConvite = 'nunca' | 'na_fila' | 'enviado' | 'falhou';

export const ROTULO_SITUACAO: Record<SituacaoConvite, string> = {
  nunca: 'Nunca enviado',
  na_fila: 'Na fila de envio',
  enviado: 'Enviado',
  falhou: 'Falha no envio'
};

export type FiltroConvite = 'todos' | 'nunca' | 'enviado' | 'enviado7' | 'falhou' | 'na_fila';
export type FiltroCriacao = 'qualquer' | '7' | '30' | 'mais30';

export type FiltrosConvite = {
  q: string;
  lotacao: string;
  funcao: string;
  convite: FiltroConvite;
  criacao: FiltroCriacao;
  pagina: number;
};

const CONVITES: FiltroConvite[] = ['todos', 'nunca', 'enviado', 'enviado7', 'falhou', 'na_fila'];
const CRIACOES: FiltroCriacao[] = ['qualquer', '7', '30', 'mais30'];

function texto(v: unknown, max: number) {
  return String(Array.isArray(v) ? v[0] : (v ?? ''))
    .trim()
    .slice(0, max);
}

/** Lê os filtros da URL sem confiar no que veio: valores fora da lista voltam ao padrão. */
export function lerFiltrosConvite(sp: Record<string, string | string[] | undefined>): FiltrosConvite {
  const convite = texto(sp.convite, 20) as FiltroConvite;
  const criacao = texto(sp.criacao, 10) as FiltroCriacao;
  return {
    q: texto(sp.q, 80),
    lotacao: texto(sp.lotacao, 200),
    funcao: texto(sp.funcao, 200),
    convite: CONVITES.includes(convite) ? convite : 'todos',
    criacao: CRIACOES.includes(criacao) ? criacao : 'qualquer',
    pagina: Math.max(1, Math.floor(Number(texto(sp.p, 6))) || 1)
  };
}

/** Situação do último convite a partir do e-mail na fila. Sem e-mail (já saiu da fila pela limpeza), conta como enviado. */
export function situacaoDoEmail(
  email: { existe: boolean; enviadoEm: Date | null; desistiuEm: Date | null } | null
): SituacaoConvite {
  if (!email) return 'nunca';
  if (!email.existe || email.enviadoEm) return 'enviado';
  if (email.desistiuEm) return 'falhou';
  return 'na_fila';
}

/** Endereço com formato aceitável para receber o convite (endereços .test são fictícios). */
export function emailConvidavel(email: string): boolean {
  const e = email.trim();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && !/\.test$/i.test(e);
}
