import { describe, expect, it } from 'vitest';
import { usuarioCandidato, usuarioValido } from '@/lib/dominio/regras';

describe('usuário do portal', () => {
  it('usa primeiro e último nome, sem acentos nem partículas', () => {
    expect(usuarioCandidato('Maria Exemplo da Silva', 1)).toBe('maria.silva');
    expect(usuarioCandidato('  JOSÉ  de  Araújo  ', 1)).toBe('jose.araujo');
    expect(usuarioCandidato("Ana D'Ávila", 1)).toBe('ana.avila');
  });
  it('acrescenta número quando já existe', () => {
    expect(usuarioCandidato('Maria Exemplo da Silva', 2)).toBe('maria.silva2');
    expect(usuarioCandidato('Maria Exemplo da Silva', 12)).toBe('maria.silva12');
  });
  it('nome de uma palavra só', () => {
    expect(usuarioCandidato('Xuxa', 1)).toBe('xuxa');
  });
  it('limita a 30 caracteres', () => {
    const u = usuarioCandidato('Maximilianoalberto Constantinopolitano', 15);
    expect(u.length).toBeLessThanOrEqual(30);
    expect(u.endsWith('15')).toBe(true);
  });
  it('todo candidato passa na validação do login', () => {
    for (const nome of ['Maria Exemplo da Silva', 'Xuxa', "Ana D'Ávila", 'Maximilianoalberto Constantinopolitano']) {
      for (const n of [1, 2, 99]) expect(usuarioValido(usuarioCandidato(nome, n))).toBe(true);
    }
    expect(usuarioValido('12345')).toBe(false);
    expect(usuarioValido('Maria.Silva')).toBe(false);
  });
});
