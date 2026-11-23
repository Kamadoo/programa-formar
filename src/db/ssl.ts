import { existsSync, readFileSync } from 'node:fs';

/**
 * TLS da conexão com o Postgres gerenciado, verificando o certificado do servidor.
 * DATABASE_CA_CERT pode ser o conteúdo PEM (comum em painéis de hospedagem) ou o caminho do arquivo .crt.
 * Banco em localhost dispensa TLS.
 */
export function opcoesSsl(url: string): { ca: string; rejectUnauthorized: true } | undefined {
  const host = new URL(url).hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return undefined;
  const v = process.env.DATABASE_CA_CERT?.trim();
  if (!v) {
    throw new Error(
      'DATABASE_CA_CERT não definido: baixe o certificado do banco no painel do Supabase (Database settings → SSL) e informe o conteúdo ou o caminho.'
    );
  }
  const ca = v.startsWith('-----BEGIN') ? v.replace(/\\n/g, '\n') : existsSync(v) ? readFileSync(v, 'utf8') : '';
  if (!ca) throw new Error('DATABASE_CA_CERT não é um certificado PEM nem um caminho de arquivo existente.');
  return { ca, rejectUnauthorized: true };
}

/** Remove sslmode da URL: o TLS é configurado por opcoesSsl (evita o pg ignorar o certificado informado). */
export function semSslmode(url: string): string {
  const u = new URL(url);
  u.searchParams.delete('sslmode');
  return u.toString();
}
