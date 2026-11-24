import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { popGraphicsState, pushGraphicsState, setCharacterSpacing, type PDFFont, type PDFPage } from 'pdf-lib';
import { cor, novoDocumento, quebrar } from './base';
import { dataCurta } from '@/lib/dominio/regras';
import type { DetalheFormacao } from '@/lib/dominio/servico';

// A4 paisagem, no modelo enviado pela SEMED (Lista_presenca_*.pdf).
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
const FUNDO_ASSIN_CAB = cor('#e2f5fb');
const FUNDO_ASSIN = cor('#f7fafb');

const FAIXA = ['#35e47d', '#3ecdf3', '#6c60e6', '#dd2287', '#e6502c'];
const PARADAS = [0, 0.28, 0.55, 0.8, 1];

let logoFormar: Promise<Uint8Array> | null = null;

/** Faixa colorida da marca no topo (degradê desenhado em fatias). */
function faixa(page: PDFPage) {
  const fatias = 160;
  const rgb = FAIXA.map(h => parseInt(h.slice(1), 16)).map(n => [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  for (let i = 0; i < fatias; i++) {
    const p = i / (fatias - 1);
    const k = Math.min(
      PARADAS.length - 2,
      PARADAS.findIndex((v, j) => p >= v && p <= PARADAS[j + 1])
    );
    const t = (p - PARADAS[k]) / (PARADAS[k + 1] - PARADAS[k]);
    const c = rgb[k].map((v, j) => Math.round(v + (rgb[k + 1][j] - v) * t));
    page.drawRectangle({
      x: (L / fatias) * i,
      y: A - 2.6,
      width: L / fatias + 0.5,
      height: 2.6,
      color: cor('#' + c.map(v => v.toString(16).padStart(2, '0')).join(''))
    });
  }
}

/** Texto com espaçamento entre letras (rótulos em caixa alta). */
function espacado(
  page: PDFPage,
  texto: string,
  o: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof cor>; espaco: number }
) {
  page.pushOperators(pushGraphicsState(), setCharacterSpacing(o.espaco));
  page.drawText(texto, { x: o.x, y: o.y, size: o.size, font: o.font, color: o.color });
  page.pushOperators(popGraphicsState());
}

function celula(page: PDFPage, x: number, topo: number, w: number, h: number, fundo?: ReturnType<typeof cor>) {
  page.drawRectangle({
    x,
    y: A - topo - h,
    width: w,
    height: h,
    borderColor: GRADE,
    borderWidth: 0.75,
    ...(fundo ? { color: fundo } : {})
  });
}

/** Lista de presença para impressão e assinatura: uma coluna por encontro e a assinatura no fim da linha. */
export async function gerarListaPresenca(det: DetalheFormacao): Promise<Uint8Array> {
  const { doc, fontes: f, logo } = await novoDocumento(`Lista de presença — ${det.formacao.titulo}`);
  logoFormar ??= readFile(path.join(process.cwd(), 'assets', 'marca', 'programa-formar-logo-horizontal.png'));
  const marca = await doc.embedPng(await logoFormar);

  const encs = det.encontros;
  const linhas = det.participantes;
  const colNome = 118.5;
  const colMat = 46.4;
  const colAssin = 124.3;
  const largEncs = DIR - M - colNome - colMat - colAssin;
  const colEnc = largEncs / Math.max(1, encs.length);
  const topoTabela = 125.6;
  const altCab = 23.8;
  const altLinha = 31.6;
  const limite = 540;
  const porPagina = Math.max(1, Math.floor((limite - topoTabela - altCab) / altLinha));
  const total = Math.max(1, Math.ceil(linhas.length / porPagina));
  const fm = det.formacao;

  for (let pg = 0; pg < total; pg++) {
    const page = doc.addPage([L, A]);
    faixa(page);

    // Cabeçalho: marca do Programa Formar à esquerda, Prefeitura à direita.
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

    espacado(page, 'LISTA DE PRESENÇA', { x: M, y: A - 88, size: 5.8, font: f.bold, color: AZUL, espaco: 0.9 });
    const titulo = quebrar(fm.titulo, f.bold, 11.6, DIR - M)[0];
    page.drawText(titulo, { x: M, y: A - 104, size: 11.6, font: f.bold, color: ESCURO });
    page.drawText(`Formador(a): ${fm.formador} · ${det.periodo} · ${fm.local}`, {
      x: M,
      y: A - 116,
      size: 7,
      font: f.regular,
      color: CINZA
    });

    // Cabeçalho da tabela.
    let xc = M;
    const cab = (w: number, rotulo: string, sub?: string, assin = false) => {
      celula(page, xc, topoTabela, w, altCab, assin ? FUNDO_ASSIN_CAB : FUNDO_CAB);
      const fonte = f.bold;
      const tam = 5.6;
      if (sub) {
        const w1 = fonte.widthOfTextAtSize(rotulo, tam);
        page.drawText(rotulo, {
          x: xc + (w - w1) / 2,
          y: A - topoTabela - 10,
          size: tam,
          font: fonte,
          color: CINZA_CAB
        });
        const w2 = f.regular.widthOfTextAtSize(sub, 5.4);
        page.drawText(sub, {
          x: xc + (w - w2) / 2,
          y: A - topoTabela - 17.5,
          size: 5.4,
          font: f.regular,
          color: CINZA
        });
      } else {
        espacado(page, rotulo, {
          x: xc + 5,
          y: A - topoTabela - altCab / 2 - 2,
          size: tam,
          font: fonte,
          color: assin ? AZUL : CINZA_CAB,
          espaco: 0.35
        });
      }
      xc += w;
    };
    cab(colNome, 'SERVIDOR(A)');
    cab(colMat, 'MATRÍCULA');
    for (const e of encs) cab(colEnc, `E${e.ordem}`, dataCurta(e.data));
    cab(colAssin, 'ASSINATURA DO(A) SERVIDOR(A)', undefined, true);

    // Linhas.
    let topo = topoTabela + altCab;
    for (const p of linhas.slice(pg * porPagina, (pg + 1) * porPagina)) {
      const yb = A - topo;
      celula(page, M, topo, colNome, altLinha);
      page.drawText(quebrar(p.nome, f.semibold, 7.4, colNome - 10)[0], {
        x: M + 5,
        y: yb - 13.5,
        size: 7.4,
        font: f.semibold,
        color: ESCURO
      });
      page.drawText(p.cpfMascara, { x: M + 5, y: yb - 21.5, size: 5.2, font: f.regular, color: CINZA });
      celula(page, M + colNome, topo, colMat, altLinha);
      page.drawText(p.matricula, {
        x: M + colNome + 5,
        y: yb - altLinha / 2 - 2.4,
        size: 7,
        font: f.regular,
        color: ESCURO
      });
      encs.forEach((_, i) => celula(page, M + colNome + colMat + i * colEnc, topo, colEnc, altLinha));
      celula(page, DIR - colAssin, topo, colAssin, altLinha, FUNDO_ASSIN);
      topo += altLinha;
    }

    // Rodapé: instrução e assinatura do(a) formador(a).
    page.drawText(
      `Página ${pg + 1} de ${total} · Rubrique no quadro do encontro correspondente e assine no campo ao final da linha.`,
      {
        x: M,
        y: A - 567,
        size: 5.6,
        font: f.regular,
        color: CINZA
      }
    );
    page.drawLine({ start: { x: 639.6, y: A - 558.5 }, end: { x: DIR, y: A - 558.5 }, thickness: 1, color: ESCURO });
    const ass = 'Assinatura do(a) formador(a)';
    const wa = f.regular.widthOfTextAtSize(ass, 5.6);
    page.drawText(ass, { x: (639.6 + DIR) / 2 - wa / 2, y: A - 567, size: 5.6, font: f.regular, color: CINZA });
  }
  return doc.save();
}
