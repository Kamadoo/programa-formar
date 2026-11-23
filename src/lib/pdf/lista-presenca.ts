import 'server-only';
import { cor, novoDocumento, quebrar } from './base';
import { dataCurta } from '@/lib/dominio/regras';
import type { DetalheFormacao } from '@/lib/dominio/servico';

// A4 paisagem
const L = 841.89;
const A = 595.28;
const M = 36;

/** Lista de presença para impressão e assinatura: uma coluna por encontro. */
export async function gerarListaPresenca(det: DetalheFormacao): Promise<Uint8Array> {
  const { doc, fontes: f, logo } = await novoDocumento(`Lista de presença — ${det.formacao.titulo}`);
  const encs = det.encontros;
  const linhas = det.participantes;
  const colNome = 210;
  const colMat = 58;
  const larguraEnc = Math.max(40, (L - 2 * M - colNome - colMat) / Math.max(1, encs.length));
  const alturaLinha = 26;
  const porPagina = Math.floor((A - 2 * M - 120) / alturaLinha);
  const total = Math.max(1, Math.ceil(linhas.length / porPagina));

  for (let pg = 0; pg < total; pg++) {
    const page = doc.addPage([L, A]);
    const lw = 72;
    page.drawImage(logo, {
      x: M,
      y: A - M - (logo.height / logo.width) * lw,
      width: lw,
      height: (logo.height / logo.width) * lw
    });
    page.drawText('LISTA DE PRESENÇA', { x: M + lw + 16, y: A - M - 10, size: 9, font: f.bold, color: cor('#0b7ea3') });
    const titulo = quebrar(det.formacao.titulo, f.black, 13, L - 2 * M - lw - 16)[0];
    page.drawText(titulo, { x: M + lw + 16, y: A - M - 26, size: 13, font: f.black, color: cor('#14242b') });
    page.drawText(`${det.formacao.formador} · ${det.periodo} · ${det.formacao.local}`, {
      x: M + lw + 16,
      y: A - M - 41,
      size: 9,
      font: f.regular,
      color: cor('#5b6b70')
    });

    let y = A - M - 80;
    // Cabeçalho da tabela
    page.drawRectangle({ x: M, y: y - 6, width: L - 2 * M, height: 26, color: cor('#eef3f5') });
    page.drawText('SERVIDOR(A)', { x: M + 6, y: y + 4, size: 7.5, font: f.bold, color: cor('#3d4e55') });
    page.drawText('MATRÍCULA', { x: M + colNome + 4, y: y + 4, size: 7.5, font: f.bold, color: cor('#3d4e55') });
    encs.forEach((e, i) => {
      const x = M + colNome + colMat + i * larguraEnc;
      page.drawText(`E${e.ordem}`, { x: x + 4, y: y + 8, size: 7.5, font: f.bold, color: cor('#3d4e55') });
      page.drawText(dataCurta(e.data), { x: x + 4, y: y - 1, size: 7, font: f.regular, color: cor('#5b6b70') });
    });
    y -= 6;

    for (const p of linhas.slice(pg * porPagina, (pg + 1) * porPagina)) {
      y -= alturaLinha;
      page.drawLine({ start: { x: M, y }, end: { x: L - M, y }, thickness: 0.5, color: cor('#c9d6d9') });
      page.drawText(quebrar(p.nome, f.semibold, 9, colNome - 10)[0], {
        x: M + 6,
        y: y + 13,
        size: 9,
        font: f.semibold,
        color: cor('#14242b')
      });
      page.drawText(p.cpfMascara, { x: M + 6, y: y + 4, size: 7, font: f.regular, color: cor('#5b6b70') });
      page.drawText(p.matricula, { x: M + colNome + 4, y: y + 9, size: 9, font: f.regular, color: cor('#14242b') });
      encs.forEach((_, i) => {
        const x = M + colNome + colMat + i * larguraEnc;
        page.drawLine({ start: { x, y }, end: { x, y: y + alturaLinha }, thickness: 0.5, color: cor('#c9d6d9') });
      });
    }

    page.drawText(`Página ${pg + 1} de ${total} · Assine no quadro do encontro correspondente.`, {
      x: M,
      y: M - 8,
      size: 8,
      font: f.regular,
      color: cor('#5b6b70')
    });
  }
  return doc.save();
}
