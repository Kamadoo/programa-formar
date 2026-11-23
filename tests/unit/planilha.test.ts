import { describe, expect, it } from 'vitest';
import { lerCsv, mapearColunas, validarLinhas } from '@/lib/dominio/planilha-servidores';

const CSV = `﻿Nome completo;CPF;Matrícula;E-mail institucional;Função;Lotação
Ana Teste;529.982.247-25;00458;ana.teste@edu.serraclara.example;Professora;EM Exemplo
"Bruno; com ponto e vírgula";52998224725;00500;bruno@edu.serraclara.example;;
Carla;111.111.111-11;00600;carla@edu.serraclara.example;;
Davi Souza;168.995.350-09;00700;davi@gmail.com;;
`;

describe('planilha de servidores', () => {
  it('lê CSV com ; aspas e BOM, e reconhece as colunas', () => {
    const { cabecalhos, linhas } = lerCsv(CSV);
    expect(cabecalhos[0]).toBe('Nome completo');
    expect(linhas).toHaveLength(4);
    expect(linhas[1]['Nome completo']).toBe('Bruno; com ponto e vírgula');
    const { mapa, faltando } = mapearColunas(cabecalhos);
    expect(faltando).toEqual([]);
    expect(mapa.lotacao).toBe('Lotação');
  });

  it('valida CPF, repetição e avisa e-mail de fora', () => {
    const { cabecalhos, linhas } = lerCsv(CSV);
    const v = validarLinhas(linhas, mapearColunas(cabecalhos).mapa);
    expect(v[0].erro).toBeNull();
    expect(v[0].cpfMascara).toBe('***.982.247-**');
    expect(v[1].erro).toBe('CPF repetido na linha 2');
    expect(v[2].erro).toBe('CPF inválido');
    expect(v[3].erro).toBeNull();
    expect(v[3].aviso).toMatch(/domínio/);
  });

  it('acusa colunas obrigatórias que faltam', () => {
    expect(mapearColunas(['Nome', 'CPF']).faltando).toEqual(['matricula', 'email']);
  });

  it('recupera zeros à esquerda perdidos pelo Excel', () => {
    const v = validarLinhas([{ n: 'Eva Lima', c: 52998224725, m: 458, e: 'eva@edu.serraclara.example' }], {
      nome: 'n',
      cpf: 'c',
      matricula: 'm',
      email: 'e'
    });
    expect(v[0].cpf).toBe('52998224725');
    expect(v[0].matricula).toBe('458');
  });
});
