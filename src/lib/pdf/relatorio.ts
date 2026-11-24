import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { popGraphicsState, pushGraphicsState, setCharacterSpacing, type PDFFont, type PDFPage } from 'pdf-lib';
import { cor, novoDocumento, quebrar } from './base';
import { dataBR } from '@/lib/dominio/regras';
import { hojeISO } from '@/lib/dominio/datas';
import { ROTULO_SITUACAO, type Relatorio } from '@/lib/dominio/relatorios';

// A4 paisagem, mesmo visual da lista de presença.
const L = 841.89;
const A = 595.28;
const M = 37.4;
const DIR = L - M;

const ESCURO = cor('#14242b');
const CINZA = cor('#5b6b70');
const CINZA_CAB = cor('#3d4e55');
const AZUL = cor('#0b7ea3');
const GRADE = cor('#c9d6d9');
const FUNDO_CAB = cor('#eef3f5');
const FUNDO_TOTAL = cor('#e2f5fb');

const STATUS: Record<string, string> = { planejada: 'Planejada', em_andamento: 'Em andamento', encerrada: 'Encerrada' };

let logoFormar: Promise<Uint8Array> | null = null;

function espacado(
  page: PDFPage,
  texto: string,
  o: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof cor>; espaco: number }
) {
  page.pushOperators(pushGraphicsState(), setCharacterSpacing(o.espaco));
  page.drawText(texto, { x: o.x, y: o.y, size: o.size, font: o.font, color: o.color });
  page.pushOperators(popGraphicsState());
}

function faixa(page: PDFPage) {
  const cores = ['#35e47d', '#3ecdf3', '#6c60e6', '#dd2287', '#e6502c']
    .map(h => parseInt(h.slice(1), 16))
    .map(n => [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  const paradas = [0, 0.28, 0.55, 0.8, 1];
  const fatias = 160;
  for (let i = 0; i < fatias; i++) {
    const p = i / (fatias - 1);
    const k = Math.min(
      paradas.length - 2,
      paradas.findIndex((v, j) => p >= v && p <= paradas[j + 1])
    );
    const t = (p - paradas[k]) / (paradas[k + 1] - paradas[k]);
    const c = cores[k].map((v, j) => Math.round(v + (cores[k + 1][j] - v) * t));
    page.drawRectangle({
      x: (L / fatias) * i,
      y: A - 2.6,
      width: L / fatias + 0.5,
      height: 2.6,
      color: cor('#' + c.map(v => v.toString(16).padStart(2, '0')).join(''))
    });
  }
}

/** Colunas: rótulo, largura e alinhamento (números à direita). */
const COLUNAS: [string, number, 'e' | 'd'][] = [
  ['FORMAÇÃO', 300, 'e'],
  ['SITUAÇÃO', 70, 'e'],
  ['ENCONTROS', 58, 'd'],
  ['CARGA', 48, 'd'],
  ['HORAS EXECUTADAS', 82, 'd'],
  ['PARTICIPANTES', 76, 'd'],
  ['CERTIFICADOS', 0, 'd']
];

/** Relatório de formações para impressão: totais e uma linha por formação. */
export async function gerarPdfRelatorio(r: Relatorio, geradoPor: string): Promise<Uint8Array> {
  const { doc, fontes: f, logo } = await novoDocumento('Relatório de formações');
  logoFormar ??= readFile(path.join(process.cwd(), 'assets', 'marca', 'programa-formar-logo-horizontal.png'));
  const marca = await doc.embedPng(await logoFormar);
  const larguras = COLUNAS.map(c => c[1]);
  larguras[larguras.length - 1] = DIR - M - larguras.reduce((t, w) => t + w, 0);

  const altCab = 22;
  const altLinha = 30;
  const topoPrimeira = 205;
  const topoDemais = 130;
  const limite = 545;
  const paginas: (typeof r.linhas)[] = [];
  let resto = [...r.linhas];
  let topo = topoPrimeira;
  do {
    const cabe = Math.max(1, Math.floor((limite - topo - altCab * 2) / altLinha));
    paginas.push(resto.slice(0, cabe));
    resto = resto.slice(cabe);
    topo = topoDemais;
  } while (resto.length);

  const filtro = `${r.ano ?? 'Todos os anos'} · ${ROTULO_SITUACAO[r.situacao]}`;
  const linhaTabela = (
    page: PDFPage,
    y: number,
    h: number,
    valores: string[],
    o: { fonte: PDFFont; tam: number; fundo?: ReturnType<typeof cor>; cor?: ReturnType<typeof cor> }
  ) => {
    let x = M;
    valores.forEach((v, i) => {
      const w = larguras[i];
      page.drawRectangle({
        x,
        y: A - y - h,
        width: w,
        height: h,
        borderColor: GRADE,
        borderWidth: 0.75,
        ...(o.fundo ? { color: o.fundo } : {})
      });
      const txt = quebrar(v, o.fonte, o.tam, w - 10)[0] ?? '';
      const tw = o.fonte.widthOfTextAtSize(txt, o.tam);
      page.drawText(txt, {
        x: COLUNAS[i][2] === 'd' ? x + w - 5 - tw : x + 5,
        y: A - y - h / 2 - o.tam * 0.35,
        size: o.tam,
        font: o.fonte,
        color: o.cor ?? ESCURO
      });
      x += w;
    });
  };

  paginas.forEach((linhas, pg) => {
    const page = doc.addPage([L, A]);
    faixa(page);
    const mw = 201;
    const mh = (marca.height / marca.width) * mw;
    page.drawImage(marca, { x: M, y: A - 29 - mh, width: mw, height: mh });
    page.drawText('Secretaria Municipal de Educação · Serra Clara', {
      x: M,
      y: A - 63,
      size: 5.8,
      font: f.regular,
      color: CINZA
    });
    const lw = 76;
    const lh = (logo.height / logo.width) * lw;
    page.drawImage(logo, { x: DIR - lw, y: A - 32 - lh, width: lw, height: lh });
    page.drawLine({
      start: { x: M, y: A - 72.8 },
      end: { x: DIR, y: A - 72.8 },
      thickness: 0.75,
      color: cor('#d5e0e3')
    });
    espacado(page, 'RELATÓRIO DE FORMAÇÕES', { x: M, y: A - 88, size: 5.8, font: f.bold, color: AZUL, espaco: 0.9 });
    page.drawText(`Formações · ${filtro}`, { x: M, y: A - 104, size: 11.6, font: f.bold, color: ESCURO });
    page.drawText(`Gerado em ${dataBR(hojeISO())} por ${geradoPor}`, {
      x: M,
      y: A - 116,
      size: 7,
      font: f.regular,
      color: CINZA
    });

    let y = topoDemais;
    if (pg === 0) {
      // Totais em quatro quadros.
      const t = r.totais;
      const quadros: [string, string, string][] = [
        ['Cursos realizados', String(t.encerradas), `${t.formacoes} formação(ões) no filtro`],
        ['Horas de formação executadas', `${t.horasExecutadas}h`, 'Proporcional aos encontros realizados'],
        ['Servidores participantes', String(t.servidores), `${t.participacoes} participação(ões)`],
        ['Certificados emitidos', String(t.certificados), `${t.horasCertificadas}h certificadas`]
      ];
      const gap = 10;
      const qw = (DIR - M - gap * 3) / 4;
      quadros.forEach(([rot, val, leg], i) => {
        const x = M + i * (qw + gap);
        page.drawRectangle({
          x,
          y: A - y - 60,
          width: qw,
          height: 60,
          borderColor: GRADE,
          borderWidth: 0.75,
          color: cor('#f7fafb')
        });
        page.drawText(val, { x: x + 10, y: A - y - 26, size: 18, font: f.bold, color: ESCURO });
        page.drawText(rot, { x: x + 10, y: A - y - 40, size: 7.4, font: f.semibold, color: CINZA_CAB });
        page.drawText(leg, { x: x + 10, y: A - y - 51, size: 6.2, font: f.regular, color: CINZA });
      });
      y = topoPrimeira;
    }

    linhaTabela(
      page,
      y,
      altCab,
      COLUNAS.map(c => c[0]),
      { fonte: f.bold, tam: 5.6, fundo: FUNDO_CAB, cor: CINZA_CAB }
    );
    y += altCab;
    for (const l of linhas) {
      let x = M;
      // Primeira coluna com título e programa em duas linhas.
      page.drawRectangle({
        x,
        y: A - y - altLinha,
        width: larguras[0],
        height: altLinha,
        borderColor: GRADE,
        borderWidth: 0.75
      });
      page.drawText(quebrar(l.titulo, f.semibold, 7.2, larguras[0] - 10)[0], {
        x: x + 5,
        y: A - y - 12.5,
        size: 7.2,
        font: f.semibold,
        color: ESCURO
      });
      page.drawText(quebrar(`${l.programaEixo} · ${l.periodo}`, f.regular, 5.6, larguras[0] - 10)[0], {
        x: x + 5,
        y: A - y - 22,
        size: 5.6,
        font: f.regular,
        color: CINZA
      });
      x += larguras[0];
      const resto = [
        STATUS[l.status],
        `${l.realizados}/${l.encontros}`,
        `${l.cargaTotal}h`,
        `${l.horasExecutadas}h`,
        String(l.participantes),
        String(l.certificados)
      ];
      resto.forEach((v, i) => {
        const w = larguras[i + 1];
        page.drawRectangle({
          x,
          y: A - y - altLinha,
          width: w,
          height: altLinha,
          borderColor: GRADE,
          borderWidth: 0.75
        });
        const tw = f.regular.widthOfTextAtSize(v, 7);
        page.drawText(v, {
          x: COLUNAS[i + 1][2] === 'd' ? x + w - 5 - tw : x + 5,
          y: A - y - altLinha / 2 - 2.4,
          size: 7,
          font: f.regular,
          color: ESCURO
        });
        x += w;
      });
      y += altLinha;
    }
    if (pg === paginas.length - 1) {
      const t = r.totais;
      linhaTabela(
        page,
        y,
        altCab,
        ['Total', '', '', '', `${t.horasExecutadas}h`, String(t.participacoes), String(t.certificados)],
        {
          fonte: f.bold,
          tam: 7,
          fundo: FUNDO_TOTAL
        }
      );
      if (!r.linhas.length)
        page.drawText('Nenhuma formação com esses filtros.', {
          x: M,
          y: A - y - altCab - 18,
          size: 8,
          font: f.regular,
          color: CINZA
        });
    }
    page.drawText(`Página ${pg + 1} de ${paginas.length} · Programa Formar`, {
      x: M,
      y: A - 567,
      size: 5.6,
      font: f.regular,
      color: CINZA
    });
  });
  return doc.save();
}
