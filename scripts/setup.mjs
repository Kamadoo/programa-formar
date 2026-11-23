// Cria o .env.local de desenvolvimento com chaves aleatórias (só se ainda não existir).
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';

const arquivo = '.env.local';
if (existsSync(arquivo)) {
  console.log(`${arquivo} já existe — nada a fazer.`);
} else {
  const chave = () => randomBytes(32).toString('base64');
  writeFileSync(
    arquivo,
    [
      '# Gerado por npm run setup — NÃO versionar. Em produção, use um cofre de segredos.',
      '# Sem DATABASE_URL, o site usa o PostgreSQL embutido (PGlite) em .data/pglite.',
      '# DATABASE_URL=postgres://usuario:senha@host:5432/programa_formar',
      `CPF_HMAC_KEY=${chave()}`,
      `CPF_ENC_KEY=${chave()}`,
      'SITE_URL=http://localhost:3000',
      ''
    ].join('\n')
  );
  console.log(`${arquivo} criado com chaves novas.`);
}
