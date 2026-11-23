import { describe, expect, it } from 'vitest';
import { erroPermanente, esperaMinutos, MAX_TENTATIVAS, resumoErro } from '@/lib/email-fila';

describe('fila de e-mails', () => {
  it('espera cada vez mais entre tentativas', () => {
    expect([1, 2, 3, 4, 5, 6].map(esperaMinutos)).toEqual([1, 5, 15, 60, 240, 240]);
    expect(MAX_TENTATIVAS).toBe(6);
  });
  it('reconhece erros que não adianta repetir', () => {
    expect(erroPermanente('MessageRejected')).toBe(true);
    expect(erroPermanente('ThrottlingException')).toBe(false);
    expect(erroPermanente(undefined)).toBe(false);
  });
  it('não guarda chaves de acesso nas mensagens de erro', () => {
    const e = new Error('chave AKIAIOSFODNN7EXAMPLE inválida');
    e.name = 'UnrecognizedClientException';
    expect(resumoErro(e)).toBe('UnrecognizedClientException: chave [chave] inválida');
  });
});
