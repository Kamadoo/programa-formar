// Converte o certificado .crt do Supabase para uma linha (com \n), formato aceito em variável de ambiente.
// Uso: node scripts/ca-uma-linha.mjs C:\caminho\supabase-ca.crt
import { readFileSync } from 'node:fs';

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('Informe o caminho do arquivo .crt');
  process.exit(1);
}
const pem = readFileSync(arquivo, 'utf8').trim();
if (!pem.startsWith('-----BEGIN CERTIFICATE-----')) {
  console.error('O arquivo não parece um certificado PEM.');
  process.exit(1);
}
console.log(pem.replace(/\r?\n/g, '\\n'));
