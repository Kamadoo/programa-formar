import { afterEach, describe, expect, it } from 'vitest';
import { opcoesSsl, semSslmode } from '@/db/ssl';

const PEM = '-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----';

describe('TLS do banco', () => {
  afterEach(() => {
    delete process.env.DATABASE_CA_CERT;
  });

  it('dispensa TLS no localhost', () => {
    expect(opcoesSsl('postgres://u:s@localhost:5432/db')).toBeUndefined();
  });

  it('exige o certificado em banco remoto', () => {
    expect(() => opcoesSsl('postgres://u:s@aws-0-sa-east-1.pooler.supabase.com:6543/postgres')).toThrow(
      /DATABASE_CA_CERT/
    );
  });

  it('aceita o PEM com \\n escapado (variável de ambiente de uma linha)', () => {
    process.env.DATABASE_CA_CERT = PEM;
    const o = opcoesSsl('postgres://u:s@db.exemplo.supabase.co:5432/postgres');
    expect(o?.rejectUnauthorized).toBe(true);
    expect(o?.ca).toContain('\nABC\n');
  });

  it('tira o sslmode da URL', () => {
    expect(semSslmode('postgres://u:s@h:5432/db?sslmode=require&x=1')).toBe('postgres://u:s@h:5432/db?x=1');
  });
});
