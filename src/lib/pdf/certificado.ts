import 'server-only';
import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib';
import type { DadosCertificado } from '@/components/certificado/CertificadoPreview';
import { cor, novoDocumento, quebrar, textoCentro } from './base';

// A4 paisagem em pontos.
const L = 841.89;
const A = 595.28;
const ROSA = cor('#e5157f');
const ESCURO = cor('#2b2b2b');
const TEXTO = cor('#1d1d1f');
const CINZA = cor('#6b6b6b');

function moldura(page: PDFPage) {
  const m = 0.03 * L;
  page.drawRectangle({ x: m, y: m, width: L - 2 * m, height: A - 2 * m, borderColor: ROSA, borderWidth: 4.6 });
  const m2 = m + 11;
  page.drawRectangle({ x: m2, y: m2, width: L - 2 * m2, height: A - 2 * m2, borderColor: ROSA, borderWidth: 1.4 });
}

function frente(page: PDFPage, d: DadosCertificado, f: Record<string, PDFFont>, logo: PDFImage) {
  moldura(page);
  const largura = L * 0.7;
  textoCentro(page, 'CERTIFICADO', { y: A - 120, fonte: f.black, tamanho: 46, largura, cor: ESCURO });
  let y = textoCentro(
    page,
    'A Prefeitura de Serra Clara, por meio da Secretaria Municipal de Educação, certifica que',
    {
      y: A - 190,
      fonte: f.regular,
      tamanho: 14.5,
      largura
    }
  );
  // Nome com linha abaixo.
  y -= 18;
  const tamNome = d.nome.length > 42 ? 20 : 24;
  y = textoCentro(page, d.nome, { y, fonte: f.black, tamanho: tamNome, largura });
  const linha = Math.max(f.black.widthOfTextAtSize(d.nome, tamNome) + 60, L * 0.5);
  page.drawLine({
    start: { x: L / 2 - linha / 2, y: y + tamNome * 0.9 },
    end: { x: L / 2 + linha / 2, y: y + tamNome * 0.9 },
    thickness: 1,
    color: cor('#a8a8a8')
  });
  y -= 14;
  y = textoCentro(
    page,
    `participou da formação “${d.formacao}”, com carga horária total de ${d.cargaTotal} horas, totalizando ${d.cargaCumprida} horas de participação.`,
    { y, fonte: f.regular, tamanho: 14.5, largura }
  );
  y -= 10;
  textoCentro(page, `${d.cidade}, ${d.dataExtenso}.`, { y, fonte: f.regular, tamanho: 14.5, largura });

  // Assinaturas e logo.
  const base = 92;
  const larg = 190;
  d.assinaturas.slice(0, 2).forEach((a, i) => {
    const x = 70 + i * (larg + 40);
    page.drawLine({
      start: { x, y: base + 26 },
      end: { x: x + larg, y: base + 26 },
      thickness: 0.8,
      color: cor('#555555')
    });
    for (const [j, [t, fonte, tam]] of (
      [
        [a.nome, f.bold, 9.5],
        [a.cargo, f.regular, 9]
      ] as const
    ).entries()) {
      const linhas = quebrar(t, fonte, tam, larg);
      page.drawText(linhas[0], { x, y: base + 12 - j * 13, size: tam, font: fonte, color: TEXTO });
    }
  });
  const lw = 130;
  const lh = (logo.height / logo.width) * lw;
  page.drawImage(logo, { x: L - 70 - lw, y: base - 6, width: lw, height: lh });
}

function verso(page: PDFPage, d: DadosCertificado, f: Record<string, PDFFont>) {
  moldura(page);
  const esq = 0.03 * L + 52;
  const largura = L - 2 * esq;
  textoCentro(page, 'CONTEÚDO PROGRAMÁTICO', { y: A - 90, fonte: f.black, tamanho: 24, largura, cor: ESCURO });
  let y = textoCentro(page, d.formacao, {
    y: A - 124,
    fonte: f.black,
    tamanho: 16,
    largura: largura * 0.9,
    cor: ROSA,
    entrelinha: 1.3
  });
  page.drawLine({ start: { x: L / 2 - 70, y: y + 8 }, end: { x: L / 2 + 70, y: y + 8 }, thickness: 2, color: ROSA });
  y -= 18;

  // Módulos em até duas colunas.
  const topo = y;
  const limite = 150;
  const colLarg = largura / 2 - 12;
  let col = 0;
  for (const [i, m] of d.modulos.entries()) {
    const titulo = quebrar(`${i + 1}. ${m.titulo}`, f.bold, 12, colLarg);
    const itens = m.itens.flatMap(it => quebrar(`•  ${it}`, f.regular, 10.5, colLarg - 14));
    const altura = titulo.length * 16 + itens.length * 14.5 + 8;
    if (y - altura < limite && col === 0) {
      col = 1;
      y = topo;
    }
    if (y - altura < limite) break; // não cabe mais (conteúdo muito longo)
    const x = esq + col * (colLarg + 24);
    for (const t of titulo) {
      page.drawText(t, { x, y, size: 12, font: f.bold, color: ROSA });
      y -= 16;
    }
    for (const t of itens) {
      page.drawText(t, { x: x + 12, y, size: 10.5, font: f.regular, color: TEXTO });
      y -= 14.5;
    }
    y -= 8;
  }

  // Rodapé com cargas e validação.
  let yb = 128;
  const linhas: [string, PDFFont][] = [
    [
      `Carga horária total do curso: ${d.cargaTotal} horas (${d.cargaPresencial}h presenciais${d.cargaEstudo ? ` + ${d.cargaEstudo}h de estudos complementares` : ''})`,
      f.regular
    ],
    [
      `Carga horária executada: ${d.presencialCumprida}h presenciais${d.cargaEstudo ? ` + ${d.estudoCumprida}h de estudos complementares` : ''}`,
      f.regular
    ],
    [`Carga horária total executada: ${d.cargaCumprida} horas`, f.bold]
  ];
  for (const [t, fonte] of linhas) {
    page.drawText(t, { x: esq, y: yb, size: 10, font: fonte, color: TEXTO });
    yb -= 15;
  }
  yb -= 4;
  page.drawText(`Emitido eletronicamente em ${d.dataEmissaoBR}  ·  Código de validação: `, {
    x: esq,
    y: yb,
    size: 9,
    font: f.regular,
    color: CINZA
  });
  const w = f.regular.widthOfTextAtSize(`Emitido eletronicamente em ${d.dataEmissaoBR}  ·  Código de validação: `, 9);
  page.drawText(d.codigo, { x: esq + w, y: yb, size: 9, font: f.bold, color: ESCURO });
  page.drawText(`Confira a autenticidade em ${d.urlValidacao}`, {
    x: esq,
    y: yb - 13,
    size: 9,
    font: f.regular,
    color: CINZA
  });
}

/** PDF A4 paisagem, frente e verso. */
export async function gerarPdfCertificado(d: DadosCertificado): Promise<Uint8Array> {
  const { doc, fontes, logo } = await novoDocumento(`Certificado — ${d.formacao} — ${d.nome}`);
  doc.setSubject(`Código de validação ${d.codigo}`);
  frente(doc.addPage([L, A]), d, fontes, logo);
  verso(doc.addPage([L, A]), d, fontes);
  return doc.save();
}
