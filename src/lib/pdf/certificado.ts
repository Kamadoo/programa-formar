import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib';
import type { DadosCertificado } from '@/components/certificado/CertificadoPreview';
import { horasTexto } from '@/lib/dominio/regras';
import { cor, documentoVazio, quebrar } from './base';

/*
 * Modelo oficial enviado pela SEMED (Certificado_Nova_Lima - 2 páginas.pptx): a arte de fundo já traz a moldura,
 * o brasão, o título, as assinaturas eletrônicas e a marca da Prefeitura. Aqui entram só os textos variáveis,
 * nas posições do modelo. As medidas abaixo estão em pontos do slide original (1440 × 1018,5) e são convertidas
 * para A4 paisagem.
 */
const L = 841.89;
const A = 595.28;
const K = L / 1440;
const x = (m: number) => m * K;
const y = (m: number) => A - m * K;
const t = (tam: number) => tam * K;

const TEXTO = cor('#231f20');
const ROSA = cor('#fd0081');
const CINZA = cor('#6e6a6b');
/** Recuo interno das caixas de texto do modelo (2 pt). */
const INS = 2;
/** Espaçamento entre linhas dos parágrafos longos do modelo (164,478%). */
const ESPACO = 1.64478;

// Caminhos literais: o build inclui só estes arquivos no pacote do servidor.
const arquivos = {
  frente: () => readFile(path.join(process.cwd(), 'assets', 'certificado', 'frente.jpg')),
  verso: () => readFile(path.join(process.cwd(), 'assets', 'certificado', 'verso.jpg')),
  // Arimo = mesmas medidas da Arial, a fonte do modelo (licença livre, assets/fontes/LICENSE-Arimo.txt).
  regular: () => readFile(path.join(process.cwd(), 'assets', 'fontes', 'arimo-regular.ttf')),
  bold: () => readFile(path.join(process.cwd(), 'assets', 'fontes', 'arimo-bold.ttf'))
};
type Fontes = { regular: PDFFont; bold: PDFFont };

/** Linha de base da 1ª linha de uma caixa do modelo (topo em pontos do modelo). */
function base(topo: number, tam: number, espaco = 1) {
  return topo + INS + tam * 1.2 * (espaco - 1) + tam * 0.905;
}

/** Texto centralizado em cx (medidas do modelo); devolve a quantidade de linhas usadas. */
function centro(
  page: PDFPage,
  texto: string,
  o: {
    topo: number;
    cx: number;
    largura: number;
    tam: number;
    fonte: PDFFont;
    cor?: ReturnType<typeof cor>;
    espaco?: number;
    maxLinhas?: number;
  }
) {
  let tam = o.tam;
  let linhas = quebrar(texto, o.fonte, t(tam), x(o.largura - 2 * INS));
  // Como no modelo (ajuste automático do PowerPoint): se não couber nas linhas da caixa, a fonte diminui.
  while (o.maxLinhas && linhas.length > o.maxLinhas && tam > o.tam * 0.6) {
    tam -= 0.25;
    linhas = quebrar(texto, o.fonte, t(tam), x(o.largura - 2 * INS));
  }
  const passo = tam * 1.2 * (o.espaco ?? 1);
  let b = base(o.topo, tam, o.espaco);
  for (const l of linhas) {
    const w = o.fonte.widthOfTextAtSize(l, t(tam));
    page.drawText(l, { x: x(o.cx) - w / 2, y: y(b), size: t(tam), font: o.fonte, color: o.cor ?? TEXTO });
    b += passo;
  }
  return linhas.length;
}

function frente(page: PDFPage, d: DadosCertificado, f: Fontes, fundo: PDFImage) {
  page.drawImage(fundo, { x: 0, y: 0, width: L, height: A });
  const cx = 709.5;
  centro(page, 'A Prefeitura de Serra Clara, por meio da Secretaria Municipal de Educação, certifica que', {
    topo: 296.25,
    cx,
    largura: 1049.06,
    tam: 21.75,
    fonte: f.regular,
    espaco: ESPACO,
    maxLinhas: 1
  });
  centro(page, d.nome, { topo: 390.75, cx, largura: 1070.85, tam: 25.5, fonte: f.bold, maxLinhas: 1 });
  page.drawRectangle({ x: x(222.75), y: y(423 + 0.75), width: x(973.5), height: x(0.75), color: TEXTO });
  centro(
    page,
    `participou do treinamento “${d.formacao}”, realizado pela Secretaria Municipal de Educação, totalizando ${horasTexto(d.cargaCumprida)} horas de participação.`,
    { topo: 461.25, cx, largura: 1049.06, tam: 21.75, fonte: f.regular, espaco: ESPACO, maxLinhas: 2 }
  );
  centro(page, `${d.cidade}, ${d.dataExtenso}.`, {
    topo: 603,
    cx,
    largura: 1120.35,
    tam: 21.75,
    fonte: f.regular,
    maxLinhas: 1
  });
}

type Bloco = { titulo: string[]; itens: string[][] };

function verso(page: PDFPage, d: DadosCertificado, f: Fontes, fundo: PDFImage) {
  page.drawImage(fundo, { x: 0, y: 0, width: L, height: A });
  centro(page, 'CONTEÚDO PROGRAMÁTICO', { topo: 165, cx: 720, largura: 1265.55, tam: 36, fonte: f.bold });
  // Nome do curso numa linha, como no modelo (diminui a fonte se for longo).
  centro(page, d.formacao, {
    topo: 240,
    cx: 720,
    largura: 1265.55,
    tam: 21.75,
    fonte: f.bold,
    cor: ROSA,
    maxLinhas: 1
  });
  const desce = 0;
  page.drawRectangle({ x: x(596.25), y: y(296.25 + desce + 2.25), width: x(247.5), height: x(2.25), color: ROSA });

  // Grade do modelo: módulos 1, 2 e 3 à esquerda, 4, 5 e 6 à direita. Mais de 6: divide ao meio e aperta.
  const mods = d.modulos;
  const porColuna = mods.length <= 6 ? 3 : Math.ceil(mods.length / 2);
  const topo0 = 330 + desce;
  const limite = 895;
  const colX = [182.25, 746.25];
  const larg = 562.65;
  // Passo entre módulos do modelo (3 por coluna); com mais módulos, o passo encolhe para caber.
  const passo = Math.min(191.5, (limite - topo0) / porColuna);

  const montar = (e: number): Bloco[] =>
    mods.map((m, i) => ({
      titulo: quebrar(
        `${i + 1}. ${m.titulo}${m.cargaH ? ` — ${horasTexto(m.cargaH)}h` : ''}`,
        f.bold,
        t(17.25 * e),
        x(larg - 2 * INS)
      ),
      itens: m.itens.map((it, j) => {
        const h = m.cargasItens?.[j];
        return quebrar(`• ${it}${h ? ` (${horasTexto(h)}h)` : ''}`, f.regular, t(14.25 * e), x(larg - 22.5 - 2 * INS));
      })
    }));
  const altura = (b: Bloco, e: number) => (b.titulo.length * 27.56 + b.itens.flat().length * 27.375) * e;

  // Reduz tudo junto (até 70%) quando o conteúdo não cabe na página.
  let e = 1;
  let blocos = montar(e);
  const fimColuna = (bl: Bloco[], esc: number) => {
    const fins = [topo0, topo0];
    bl.forEach((b, i) => {
      const c = i < porColuna ? 0 : 1;
      const linha = c ? i - porColuna : i;
      const inicio = Math.max(topo0 + linha * passo * esc, fins[c] + (linha ? 22 * esc : 0));
      fins[c] = inicio + altura(b, esc);
    });
    return Math.max(...fins);
  };
  while (fimColuna(blocos, e) > limite && e > 0.7) {
    e -= 0.05;
    blocos = montar(e);
  }

  const fins = [topo0, topo0];
  blocos.forEach((b, i) => {
    const c = i < porColuna ? 0 : 1;
    const linha = c ? i - porColuna : i;
    let topo = Math.max(topo0 + linha * passo * e, fins[c] + (linha ? 22 * e : 0));
    for (const l of b.titulo) {
      if (topo + 27.56 * e > limite) return;
      page.drawText(l, {
        x: x(colX[c] + INS),
        y: y(base(topo, 17.25 * e)),
        size: t(17.25 * e),
        font: f.bold,
        color: ROSA
      });
      topo += 27.56 * e;
    }
    for (const it of b.itens)
      for (const l of it) {
        if (topo + 27.375 * e > limite) return;
        page.drawText(l, {
          x: x(colX[c] + 22.5 + INS),
          y: y(base(topo, 14.25 * e)),
          size: t(14.25 * e),
          font: f.regular,
          color: TEXTO
        });
        topo += 27.375 * e;
      }
    fins[c] = topo;
  });

  // Rodapé: carga executada (esquerda) e emissão + código (direita).
  page.drawText(`Carga horária total executada: ${horasTexto(d.cargaCumprida)} horas`, {
    x: x(182.25 + INS),
    y: y(base(911.25, 17.25)),
    size: t(17.25),
    font: f.bold,
    color: TEXTO
  });
  const emissao = `Emitido eletronicamente em ${d.dataEmissaoBR} · Código de validação: ${d.codigo}`;
  let tam = 12;
  while (f.regular.widthOfTextAtSize(emissao, t(tam)) > x(1305 - 791.04) && tam > 9) tam -= 0.25;
  page.drawText(emissao, { x: x(791.04 + INS), y: y(base(914.25, tam)), size: t(tam), font: f.regular, color: CINZA });
}

let cacheArquivos: Promise<Record<keyof typeof arquivos, Uint8Array>> | null = null;

/** PDF A4 paisagem, frente e verso, no modelo oficial. */
export async function gerarPdfCertificado(d: DadosCertificado): Promise<Uint8Array> {
  const doc = await documentoVazio(`Certificado — ${d.formacao} — ${d.nome}`);
  doc.setSubject(`Código de validação ${d.codigo}`);
  cacheArquivos ??= Promise.all([arquivos.frente(), arquivos.verso(), arquivos.regular(), arquivos.bold()]).then(
    ([frente, verso, regular, bold]) => ({
      frente,
      verso,
      regular,
      bold
    })
  );
  const b = await cacheArquivos.catch(e => {
    cacheArquivos = null;
    throw e;
  });
  const fontes: Fontes = {
    regular: await doc.embedFont(b.regular, { subset: true }),
    bold: await doc.embedFont(b.bold, { subset: true })
  };
  frente(doc.addPage([L, A]), d, fontes, await doc.embedJpg(b.frente));
  verso(doc.addPage([L, A]), d, fontes, await doc.embedJpg(b.verso));
  return doc.save();
}
