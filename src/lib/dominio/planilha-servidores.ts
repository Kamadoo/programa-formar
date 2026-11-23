/**
 * Leitura e validação da planilha da base de servidores (funções puras, testadas).
 * Colunas reconhecidas pelo nome do cabeçalho, sem acento e sem diferenciar maiúsculas.
 */
import { cpfValido, mascararCpf, normalizarBusca, somenteDigitos } from './regras';

export const MAX_LINHAS = 5000;
export const DOMINIO_INSTITUCIONAL = 'edu.serraclara.example';

export type LinhaBruta = Record<string, unknown>;

export type LinhaValidada = {
  n: number; // número da linha na planilha (cabeçalho = 1)
  nome: string;
  cpf: string; // só dígitos (nunca sai para o navegador)
  cpfMascara: string;
  matricula: string;
  email: string;
  funcao: string | null;
  lotacao: string | null;
  erro: string | null;
  aviso: string | null;
};

const COLUNAS = {
  nome: /^(nome|nome completo|servidor)/,
  cpf: /^cpf/,
  matricula: /^(matricula|mat\b|masp)/,
  email: /(e-?mail|email)/,
  funcao: /^(funcao|cargo)/,
  lotacao: /^(lotacao|escola|unidade|setor)/
};

export type MapaColunas = Partial<Record<keyof typeof COLUNAS, string>>;

export function mapearColunas(cabecalhos: string[]): { mapa: MapaColunas; faltando: string[] } {
  const mapa: MapaColunas = {};
  for (const [campo, re] of Object.entries(COLUNAS) as [keyof typeof COLUNAS, RegExp][]) {
    const achada = cabecalhos.find(c => re.test(normalizarBusca(c)));
    if (achada) mapa[campo] = achada;
  }
  const faltando = (['nome', 'cpf', 'matricula', 'email'] as const).filter(c => !mapa[c]);
  return { mapa, faltando };
}

const texto = (v: unknown) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/** Planilhas costumam perder zeros à esquerda (CPF e matrícula viram número). */
function digitos(v: unknown, tamanho?: number) {
  const d = somenteDigitos(typeof v === 'number' ? v.toFixed(0) : String(v ?? ''));
  return tamanho && d && d.length < tamanho ? d.padStart(tamanho, '0') : d;
}

export function validarLinhas(linhas: LinhaBruta[], mapa: MapaColunas): LinhaValidada[] {
  const vistosCpf = new Map<string, number>();
  const vistosMat = new Map<string, number>();
  const vistosEmail = new Map<string, number>();
  return linhas.map((r, i) => {
    const n = i + 2;
    const nome = texto(r[mapa.nome!]);
    const cpf = digitos(r[mapa.cpf!], 11);
    const matricula = digitos(r[mapa.matricula!]);
    const email = texto(r[mapa.email!]).toLowerCase();
    const funcao = mapa.funcao ? texto(r[mapa.funcao]) || null : null;
    const lotacao = mapa.lotacao ? texto(r[mapa.lotacao]) || null : null;

    let erro: string | null = null;
    if (nome.length < 3 || nome.length > 160) erro = 'Nome inválido';
    else if (!cpfValido(cpf)) erro = 'CPF inválido';
    else if (!matricula || matricula.length > 12) erro = 'Matrícula inválida';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) erro = 'E-mail inválido';
    else if (vistosCpf.has(cpf)) erro = `CPF repetido na linha ${vistosCpf.get(cpf)}`;
    else if (vistosMat.has(matricula)) erro = `Matrícula repetida na linha ${vistosMat.get(matricula)}`;
    else if (vistosEmail.has(email)) erro = `E-mail repetido na linha ${vistosEmail.get(email)}`;
    else if ((funcao?.length ?? 0) > 160 || (lotacao?.length ?? 0) > 160) erro = 'Função ou lotação muito longa';

    if (!erro) {
      vistosCpf.set(cpf, n);
      vistosMat.set(matricula, n);
      vistosEmail.set(email, n);
    }
    const aviso = !erro && !email.endsWith('@' + DOMINIO_INSTITUCIONAL) ? 'E-mail fora do domínio institucional' : null;
    return {
      n,
      nome,
      cpf,
      cpfMascara: cpf.length === 11 ? mascararCpf(cpf) : '—',
      matricula,
      email,
      funcao,
      lotacao,
      erro,
      aviso
    };
  });
}

/** CSV simples: separador ; ou , (detectado pelo cabeçalho), aspas duplas, BOM do Excel. */
export function lerCsv(conteudo: string): { cabecalhos: string[]; linhas: LinhaBruta[] } {
  const txt = conteudo.replace(/^﻿/, '');
  const primeira = txt.split(/\r?\n/, 1)[0] ?? '';
  const sep = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ';' : ',';
  const registros: string[][] = [];
  let campo = '';
  let reg: string[] = [];
  let aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (aspas) {
      if (c === '"' && txt[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      reg.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && txt[i + 1] === '\n') i++;
      reg.push(campo);
      registros.push(reg);
      reg = [];
      campo = '';
    } else campo += c;
  }
  if (campo || reg.length) {
    reg.push(campo);
    registros.push(reg);
  }
  const [cab = [], ...resto] = registros.filter(r => r.some(x => x.trim()));
  const cabecalhos = cab.map(c => c.trim());
  return { cabecalhos, linhas: resto.map(r => Object.fromEntries(cabecalhos.map((c, j) => [c, r[j] ?? '']))) };
}
