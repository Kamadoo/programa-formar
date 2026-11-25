/**
 * Regras de negócio do Programa Formar — funções puras, sem banco, testadas em tests/unit.
 * Fonte: handoff do mockup (regras 6 a 10 e máquina de estados da participação).
 */

export type StatusParticipacao = 'em_andamento' | 'liberado_auto' | 'em_conferencia' | 'liberado_validado' | 'recusado';
export type StatusFormacao = 'planejada' | 'em_andamento' | 'encerrada';

/** Frequência mínima para o certificado sair automaticamente (75%). */
export const FREQ_MINIMA_PADRAO = 0.75;
/** Abaixo da mínima e a partir deste piso (60%), o núcleo de formação avalia; abaixo dele, não há certificado. */
export const FREQ_CONFERENCIA = 0.6;

/** "75%" — para os textos da tela. */
export function pctTexto(freq: number): string {
  return `${Math.round(freq * 100)}%`;
}

/** Mínimo de encontros para atingir a frequência mínima: ceil(n × mínima). */
export function minimoEncontros(totalEncontros: number, freqMinima = FREQ_MINIMA_PADRAO): number {
  // Arredonda antes do ceil para evitar 10 × 0.7 = 7.000000000000001.
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

/** Frequência entre o piso (60%) e a mínima (75%): o núcleo de formação decide se libera. */
export function vaiParaConferencia(
  presencas: number,
  totalEncontros: number,
  freqMinima = FREQ_MINIMA_PADRAO
): boolean {
  return (
    !atingiuMinima(presencas, totalEncontros, freqMinima) && atingiuMinima(presencas, totalEncontros, FREQ_CONFERENCIA)
  );
}

/**
 * Máquina de estados da participação.
 * - Formação aberta → em_andamento (decisões anteriores são descartadas, ex.: encontro adicionado).
 * - Encerrada e frequência ≥ mínima (75%) → liberado_auto (a regra automática sempre prevalece).
 * - Encerrada e entre 60% e a mínima → mantém a decisão do gestor (validado/recusado) ou fica em_conferencia.
 * - Encerrada e abaixo de 60% → recusado (sem certificado).
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
  if (!atingiuMinima(presencas, totalEncontros, FREQ_CONFERENCIA)) return 'recusado';
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

/**
 * Prefixo do código gerado a partir da formação: sigla do programa/eixo + 3 primeiras letras do nome curto.
 * Ex.: "Compromisso Nacional Criança Alfabetizada" + "Matematica Supervisores" → CNCAMAT (código PNL-2026-CNCAMAT-0001-…).
 * Se o programa já for uma sigla (uma palavra só, ex.: "CNCA"), ela é usada como está.
 */
export function prefixoCodigo(programaEixo: string, tituloCurto: string): string {
  const palavras = (s: string) =>
    semAcentos(s)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' ')
      .split(' ')
      .filter(Boolean);
  const prog = palavras(programaEixo).filter(p => !PARTICULAS.has(p.toLowerCase()));
  const sigla =
    prog.length === 1
      ? prog[0].slice(0, 6)
      : prog
          .map(p => p[0])
          .join('')
          .slice(0, 6);
  const curto = palavras(tituloCurto).join('').slice(0, 3);
  const r = (sigla + curto).slice(0, 12);
  return r.length >= 2 ? r : (r + 'PF').slice(0, 2);
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
/* CPF ou CNPJ (contas da gestão)                                        */
/* O CNPJ pode ser alfanumérico (Receita Federal, a partir de julho/2026):  */
/* 12 caracteres de 0-9/A-Z + 2 dígitos verificadores.                     */
/* ------------------------------------------------------------------ */

export type TipoDocumento = 'cpf' | 'cnpj';

/** Maiúsculas, sem pontuação nem espaços (ex.: "12.ABC.345/01DE-35" → "12ABC34501DE35"). */
export function normalizarDocumento(entrada: string): string {
  return entrada.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

/** Validação dos dígitos verificadores do CNPJ (numérico ou alfanumérico). */
export function cnpjValido(entrada: string): boolean {
  const v = normalizarDocumento(entrada);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(v) || /^(.)\1{13}$/.test(v)) return false;
  const dv = (len: number) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += (v.charCodeAt(i) - 48) * (((len - 1 - i) % 8) + 2);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(v[12]) && dv(13) === Number(v[13]);
}

/** Tipo pelo tamanho: 11 números = CPF, 14 caracteres = CNPJ. Não confere os dígitos. */
export function tipoDocumento(entrada: string): TipoDocumento | null {
  const v = normalizarDocumento(entrada);
  if (/^\d{11}$/.test(v)) return 'cpf';
  if (v.length === 14) return 'cnpj';
  return null;
}

export function documentoValido(tipo: TipoDocumento, entrada: string): boolean {
  return tipo === 'cpf' ? cpfValido(entrada) && /^\d{11}$/.test(normalizarDocumento(entrada)) : cnpjValido(entrada);
}

/** ***.456.789-** (CPF) ou **.345.678/****-** (CNPJ) — a forma que as telas podem mostrar. */
export function mascararDocumento(tipo: TipoDocumento, entrada: string): string {
  if (tipo === 'cpf') return mascararCpf(entrada);
  const v = normalizarDocumento(entrada).padStart(14, '0');
  return `**.${v.slice(2, 5)}.${v.slice(5, 8)}/****-**`;
}

/* ------------------------------------------------------------------ */
/* Conteúdo programático (1 módulo por linha, itens com "-")             */
/* ------------------------------------------------------------------ */

export type Modulo = { titulo: string; itens: string[]; cargaH?: number; cargasItens?: number[] };

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

type EncontroConteudo = { modulo: string; topico: string; cargaH: number | null };

/** Horas como saem no certificado: 4 → "4", 2.5 → "2,5". */
export function horasTexto(h: number): string {
  return (Math.round(h * 10) / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/**
 * Carga de cada encontro: a informada nele; sem informação, a carga presencial dividida igualmente entre os
 * encontros que não têm carga própria.
 */
export function cargasEncontros(encontros: { cargaH: number | null }[], cargaPresencialH: number): number[] {
  const definida = encontros.reduce((t, e) => t + (e.cargaH ?? 0), 0);
  const semCarga = encontros.filter(e => e.cargaH == null).length;
  const resto = semCarga ? Math.max(0, cargaPresencialH - definida) / semCarga : 0;
  return encontros.map(e => e.cargaH ?? resto);
}

/**
 * Conteúdo programático montado a partir dos encontros (verso do certificado): módulos na ordem em que aparecem,
 * tópicos sem repetição, com a carga somada de cada um.
 */
export function conteudoDosEncontros(encontros: EncontroConteudo[], cargaPresencialH: number): Modulo[] {
  const cargas = cargasEncontros(encontros, cargaPresencialH);
  const chave = (s: string) => normalizarBusca(s);
  const mods: (Modulo & { cargaH: number; cargasItens: number[] })[] = [];
  encontros.forEach((e, i) => {
    const titulo = e.modulo.trim();
    if (!titulo) return;
    let m = mods.find(x => chave(x.titulo) === chave(titulo));
    if (!m) {
      m = { titulo, itens: [], cargaH: 0, cargasItens: [] };
      mods.push(m);
    }
    m.cargaH += cargas[i];
    const t = e.topico.trim();
    if (!t) return;
    const j = m.itens.findIndex(x => chave(x) === chave(t));
    if (j >= 0) m.cargasItens[j] += cargas[i];
    else {
      m.itens.push(t);
      m.cargasItens.push(cargas[i]);
    }
  });
  return mods;
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
