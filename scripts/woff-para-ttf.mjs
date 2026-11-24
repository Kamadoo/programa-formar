// Converte as fontes Inter e Arimo (WOFF 1.0 do @fontsource) para TTF, formato aceito em PDF.
// Arimo tem as mesmas medidas da Arial: é a fonte do modelo oficial do certificado.
// Uso: node scripts/woff-para-ttf.mjs   → grava em assets/fontes/
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const pesos = { regular: 400, semibold: 600, bold: 700, black: 800 };
mkdirSync('assets/fontes', { recursive: true });

function woffParaSfnt(woff) {
  const v = new DataView(woff.buffer, woff.byteOffset, woff.byteLength);
  if (v.getUint32(0) !== 0x774f4646) throw new Error('não é WOFF 1.0');
  const flavor = v.getUint32(4);
  const numTables = v.getUint16(12);
  const tabelas = [];
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20;
    const tag = v.getUint32(o);
    const offset = v.getUint32(o + 4);
    const compLength = v.getUint32(o + 8);
    const origLength = v.getUint32(o + 12);
    const checksum = v.getUint32(o + 16);
    let dados = woff.subarray(offset, offset + compLength);
    if (compLength < origLength) dados = inflateSync(dados);
    tabelas.push({ tag, checksum, dados });
  }
  let busca = 1;
  let log = 0;
  while (busca * 2 <= numTables) {
    busca *= 2;
    log++;
  }
  const cab = 12 + numTables * 16;
  const total = tabelas.reduce((t, x) => t + ((x.dados.length + 3) & ~3), cab);
  const out = Buffer.alloc(total);
  out.writeUInt32BE(flavor, 0);
  out.writeUInt16BE(numTables, 4);
  out.writeUInt16BE(busca * 16, 6);
  out.writeUInt16BE(log, 8);
  out.writeUInt16BE(numTables * 16 - busca * 16, 10);
  let pos = cab;
  tabelas.forEach((t, i) => {
    const o = 12 + i * 16;
    out.writeUInt32BE(t.tag, o);
    out.writeUInt32BE(t.checksum, o + 4);
    out.writeUInt32BE(pos, o + 8);
    out.writeUInt32BE(t.dados.length, o + 12);
    Buffer.from(t.dados).copy(out, pos);
    pos += (t.dados.length + 3) & ~3;
  });
  return out;
}

for (const [nome, peso] of Object.entries(pesos)) {
  const woff = readFileSync(`node_modules/@fontsource/inter/files/inter-latin-${peso}-normal.woff`);
  writeFileSync(`assets/fontes/inter-${nome}.ttf`, woffParaSfnt(woff));
}
copyFileSync('node_modules/@fontsource/inter/LICENSE', 'assets/fontes/LICENSE-Inter.txt');
for (const [nome, peso] of Object.entries({ regular: 400, bold: 700 })) {
  const woff = readFileSync(`node_modules/@fontsource/arimo/files/arimo-latin-${peso}-normal.woff`);
  writeFileSync(`assets/fontes/arimo-${nome}.ttf`, woffParaSfnt(woff));
}
copyFileSync('node_modules/@fontsource/arimo/LICENSE', 'assets/fontes/LICENSE-Arimo.txt');
console.log('Fontes TTF geradas em assets/fontes/');
