import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, type PDFFont, type PDFPage, rgb, type RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// Caminhos literais: assim o build inclui só estes arquivos no pacote do servidor.
// Fontes TTF geradas por scripts/woff-para-ttf.mjs (PDF não aceita WOFF).
const ler = {
  regular: () => readFile(path.join(process.cwd(), 'assets', 'fontes', 'inter-regular.ttf')),
  semibold: () => readFile(path.join(process.cwd(), 'assets', 'fontes', 'inter-semibold.ttf')),
  bold: () => readFile(path.join(process.cwd(), 'assets', 'fontes', 'inter-bold.ttf')),
  black: () => readFile(path.join(process.cwd(), 'assets', 'fontes', 'inter-black.ttf')),
  logo: () => readFile(path.join(process.cwd(), 'public', 'marca', 'logo-orgao.png'))
};
const NOMES_FONTES = ['regular', 'semibold', 'bold', 'black'] as const;

type Fontes = Record<(typeof NOMES_FONTES)[number], PDFFont>;

let cacheBytes: Promise<Record<keyof typeof ler, Uint8Array>> | null = null;
function bytesFontes() {
  cacheBytes ??= (async () => {
    const [regular, semibold, bold, black, logo] = await Promise.all([
      ler.regular(),
      ler.semibold(),
      ler.bold(),
      ler.black(),
      ler.logo()
    ]);
    return { regular, semibold, bold, black, logo };
  })();
  return cacheBytes;
}

/** Documento só com metadados e fontkit (o certificado usa as próprias fontes e a arte do modelo). */
export async function documentoVazio(titulo: string) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(titulo);
  doc.setAuthor('Secretaria Municipal de Educação de Serra Clara');
  doc.setCreator('Programa Formar');
  doc.setProducer('Programa Formar');
  doc.setLanguage('pt-BR');
  return doc;
}

export async function novoDocumento(titulo: string) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const b = await bytesFontes();
  const fontes = {} as Fontes;
  for (const k of NOMES_FONTES) {
    fontes[k] = await doc.embedFont(b[k], { subset: true });
  }
  const logo = await doc.embedPng(b.logo);
  doc.setTitle(titulo);
  doc.setAuthor('Secretaria Municipal de Educação de Serra Clara');
  doc.setCreator('Programa Formar');
  doc.setProducer('Programa Formar');
  doc.setLanguage('pt-BR');
  return { doc, fontes, logo };
}

export const cor = (hex: string): RGB => {
  const n = parseInt(hex.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/** Quebra o texto em linhas que caibam na largura. */
export function quebrar(texto: string, fonte: PDFFont, tamanho: number, largura: number): string[] {
  const linhas: string[] = [];
  for (const paragrafo of texto.split('\n')) {
    let atual = '';
    for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (fonte.widthOfTextAtSize(tentativa, tamanho) <= largura || !atual) atual = tentativa;
      else {
        linhas.push(atual);
        atual = palavra;
      }
    }
    linhas.push(atual);
  }
  return linhas;
}

/** Desenha texto centralizado (com quebra) e devolve o y logo abaixo. */
export function textoCentro(
  page: PDFPage,
  texto: string,
  o: { y: number; fonte: PDFFont; tamanho: number; largura: number; cor?: RGB; entrelinha?: number; cx?: number }
): number {
  const cx = o.cx ?? page.getWidth() / 2;
  const lh = o.tamanho * (o.entrelinha ?? 1.5);
  let y = o.y;
  for (const l of quebrar(texto, o.fonte, o.tamanho, o.largura)) {
    const w = o.fonte.widthOfTextAtSize(l, o.tamanho);
    page.drawText(l, { x: cx - w / 2, y, size: o.tamanho, font: o.fonte, color: o.cor ?? cor('#1d1d1f') });
    y -= lh;
  }
  return y;
}
