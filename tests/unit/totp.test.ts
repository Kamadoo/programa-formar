import { describe, expect, it } from 'vitest';
import {
  codigoDoPasso,
  conferirCodigo,
  gerarCodigosRecuperacao,
  gerarSegredo,
  normalizarRecuperacao
} from '@/lib/auth/totp';

// Vetor de teste do RFC 6238 (SHA-1, segredo "12345678901234567890").
const SEGREDO_RFC = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('TOTP', () => {
  it('bate com os vetores do RFC 6238', () => {
    expect(codigoDoPasso(SEGREDO_RFC, Math.floor(59 / 30))).toBe('287082');
    expect(codigoDoPasso(SEGREDO_RFC, Math.floor(1111111109 / 30))).toBe('081804');
    expect(codigoDoPasso(SEGREDO_RFC, Math.floor(1234567890 / 30))).toBe('005924');
  });

  it('aceita o passo anterior e o seguinte, e devolve o passo usado', () => {
    const agora = 1_800_000_000_000;
    const passo = Math.floor(agora / 30000);
    const anterior = codigoDoPasso(SEGREDO_RFC, passo - 1);
    expect(conferirCodigo(SEGREDO_RFC, anterior, null, agora)).toBe(passo - 1);
    expect(conferirCodigo(SEGREDO_RFC, codigoDoPasso(SEGREDO_RFC, passo - 2), null, agora)).toBeNull();
  });

  it('não aceita reutilizar um código', () => {
    const agora = 1_800_000_000_000;
    const passo = Math.floor(agora / 30000);
    const c = codigoDoPasso(SEGREDO_RFC, passo);
    expect(conferirCodigo(SEGREDO_RFC, c, passo, agora)).toBeNull();
  });

  it('ignora espaços e recusa tamanho errado', () => {
    const agora = 1_800_000_000_000;
    const c = codigoDoPasso(SEGREDO_RFC, Math.floor(agora / 30000));
    expect(conferirCodigo(SEGREDO_RFC, `${c.slice(0, 3)} ${c.slice(3)}`, null, agora)).not.toBeNull();
    expect(conferirCodigo(SEGREDO_RFC, '123', null, agora)).toBeNull();
  });

  it('gera segredos base32 de 160 bits e códigos de recuperação', () => {
    expect(gerarSegredo()).toMatch(/^[A-Z2-7]{32}$/);
    const cods = gerarCodigosRecuperacao();
    expect(cods).toHaveLength(10);
    expect(new Set(cods).size).toBe(10);
    expect(cods[0]).toMatch(/^[a-z0-9]{4}-[a-z0-9]{4}$/);
    expect(normalizarRecuperacao(' ABCD-efgh ')).toBe('abcdefgh');
  });
});
