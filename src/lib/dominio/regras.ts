/**
 * Regras de negócio do Programa Formar — funções puras, sem banco, testadas em tests/unit.
 * Fonte: handoff do mockup (regras 6 a 10 e máquina de estados da participação).
 */

export type StatusParticipacao = 'em_andamento' | 'liberado_auto' | 'em_conferencia' | 'liberado_validado' | 'recusado';
export type StatusFormacao = 'planejada' | 'em_andamento' | 'encerrada';

export const FREQ_MINIMA_PADRAO = 0.8;

/** Mínimo de encontros para atingir a frequência mínima: ceil(n × mínima). */
export function minimoEncontros(totalEncontros: number, freqMinima = FREQ_MINIMA_PADRAO): number {
  // Arredonda antes do ceil para evitar 10 × 0.8 = 8.000000000000002.
  return Math.ceil(Math.round(totalEncontros * freqMinima * 1e6) / 1e6);
}

/** Frequência em % inteiro (presenças ÷ total de encontros da formação). */
export function frequenciaPct(presencas: number, totalEncontros: number): number {
  if (totalEncontros <= 0) return 0;
  return Math.round((presencas / totalEncontros) * 100);
}

/** Atingiu a mínima? Compara pelo número de encontros, não pelo % arredondado. */
export function atingiuMinima(presencas: number, totalEncontros: number, freqMinima = FREQ_MINIMA_PADRAO): boolean {
  return totalEncontros > 0 && presencas >= minimoEncontros(totalEncontros, freqMinima);
}

/** Ainda é possível atingir a mínima, considerando os encontros que faltam? */
export function aindaPodeAtingir(
  presencas: number,
  realizados: number,
  totalEncontros: number,
  freqMinima = FREQ_MINIMA_PADRAO
): boolean {
  const restantes = Math.max(0, totalEncontros - realizados);
  return presencas + restantes >= minimoEncontros(totalEncontros, freqMinima);
}

/** Carga cumprida = round(carga × presenças ÷ n_encontros). */
export function cargaCumprida(cargaH: number, presencas: number, totalEncontros: number): number {
  if (totalEncontros <= 0) return 0;
  return Math.round((cargaH * presencas) / totalEncontros);
}

export function statusFormacao(realizados: number, totalEncontros: number): StatusFormacao {
  if (totalEncontros === 0 || realizados === 0) return 'planejada';
  return realizados >= totalEncontros ? 'encerrada' : 'em_andamento';
}

/**
 * Máquina de estados da participação.
 * - Formação aberta → em_andamento (decisões anteriores são descartadas, ex.: encontro adicionado).
 * - Encerrada e frequência ≥ mínima → liberado_auto (a regra automática sempre prevalece).
 * - Encerrada e abaixo da mínima → mantém a decisão do gestor (validado/recusado) ou fica em_conferencia.
 */
export function proximoStatus(params: {
  encerrada: boolean;
  presencas: number;
  totalEncontros: number;
  atual: StatusParticipacao;
  freqMinima?: number;
}): StatusParticipacao {
  const { encerrada, presencas, totalEncontros, atual, freqMinima } = params;
  if (!encerrada) return 'em_andamento';
  if (atingiuMinima(presencas, totalEncontros, freqMinima)) return 'liberado_auto';
  if (atual === 'liberado_validado' || atual === 'recusado') return atual;
  return 'em_conferencia';
}

export function certificadoLiberado(status: StatusParticipacao): boolean {
  return status === 'liberado_auto' || status === 'liberado_validado';
}

/* ------------------------------------------------------------------ */
/* Códigos, nomes de arquivo e formatação                               */
/* ------------------------------------------------------------------ */

// Base32 de Crockford sem I, L, O, U — fácil de ditar e digitar.
const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Código de validação: PNL-<ano>-<PREFIXO>-<sequência>-<sufixo aleatório>.
 * O sufixo impede que alguém descubra certificados de outras pessoas tentando números em sequência.
 */
export function codigoValidacao(ano: number, prefixo: string, sequencia: number, aleatorio: Uint8Array): string {
  if (aleatorio.length < 5) throw new Error('aleatorio precisa de 5 bytes');
  let sufixo = '';
  for (let i = 0; i < 5; i++) sufixo += ALFABETO[aleatorio[i] % 32];
  return `PNL-${ano}-${prefixo}-${String(sequencia).padStart(4, '0')}-${sufixo}`;
}

/** Normaliza o que a pessoa digitou na validação pública (minúsculas, espaços, O→0 etc.). */
export function normalizarCodigo(entrada: string): string {
  return entrada
    .toUpperCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export function semAcentos(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Nome_Sobrenome_<CursoCurto>_<horas>h.pdf — apenas ASCII seguro para download. */
export function nomeArquivoCertificado(nomeCompleto: string, tituloCurto: string, horas: number): string {
  const limpa = (s: string) =>
    semAcentos(s)
      .replace(/[^A-Za-z0-9 ]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  const nome = limpa(nomeCompleto).join('_');
  const curso = limpa(tituloCurto).join('');
  return `${nome}_${curso}_${horas}h.pdf`;
}

/** Para busca: minúsculas e sem acentos. */
export function normalizarBusca(s: string): string {
  return semAcentos(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/* CPF                                                                  */
/* ------------------------------------------------------------------ */

export function somenteDigitos(s: string): string {
  return s.replace(/\D/g, '');
}

/** Validação dos dígitos verificadores do CPF. */
export function cpfValido(entrada: string): boolean {
  const d = somenteDigitos(entrada);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (len: number) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(d[i]) * (len + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

/** ***.456.789-** — a forma que as telas podem mostrar. */
export function mascararCpf(entrada: string): string {
  const d = somenteDigitos(entrada).padStart(11, '0');
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

/* ------------------------------------------------------------------ */
/* Conteúdo programático (1 módulo por linha, itens com "-")             */
/* ------------------------------------------------------------------ */

export type Modulo = { titulo: string; itens: string[] };

export function parseConteudo(texto: string): Modulo[] {
  const modulos: Modulo[] = [];
  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) continue;
    if (linha.startsWith('-')) {
      const item = linha.replace(/^-+\s*/, '');
      if (!item) continue;
      if (!modulos.length) modulos.push({ titulo: 'Conteúdo', itens: [] });
      modulos[modulos.length - 1].itens.push(item);
    } else {
      modulos.push({ titulo: linha, itens: [] });
    }
  }
  return modulos;
}

/* ------------------------------------------------------------------ */
/* Datas (sempre ISO yyyy-mm-dd no banco; exibição pt-BR)                 */
/* ------------------------------------------------------------------ */

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro'
];

export function dataBR(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export function dataCurta(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}`;
}

export function dataExtenso(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

export function periodo(datasIso: string[]): string {
  if (!datasIso.length) return 'A definir';
  const ord = [...datasIso].sort();
  const ini = ord[0];
  const fim = ord[ord.length - 1];
  return ini === fim ? dataBR(ini) : `${dataBR(ini)} a ${dataBR(fim)}`;
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

export function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  return ((p[0][0] ?? '') + (p.length > 1 ? (p[p.length - 1][0] ?? '') : '')).toUpperCase();
}

const PARTICULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

/**
 * Candidato a nome de usuário do portal a partir do nome completo: "Maria Exemplo da Silva" → maria.silva,
 * depois maria.silva2, maria.silva3… (n = 1, 2, 3…). Só letras minúsculas sem acento e ponto; até 30 caracteres.
 */
export function usuarioCandidato(nomeCompleto: string, n: number): string {
  const partes = semAcentos(nomeCompleto)
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(p => p && !PARTICULAS.has(p));
  const primeiro = (partes[0] ?? 'servidor').slice(0, 14);
  const ultimo = partes.length > 1 ? '.' + partes[partes.length - 1].slice(0, 12) : '';
  const sufixo = n > 1 ? String(n) : '';
  return (primeiro + ultimo).slice(0, 30 - sufixo.length) + sufixo;
}

/** Formato aceito no campo "Usuário" do login. */
export function usuarioValido(u: string): boolean {
  return /^[a-z][a-z.]{1,28}[0-9]{0,3}$/.test(u);
}
