import { describe, expect, it } from 'vitest';
import {
  aindaPodeAtingir,
  atingiuMinima,
  cargaCumprida,
  codigoValidacao,
  cpfValido,
  dataExtenso,
  frequenciaPct,
  mascararCpf,
  minimoEncontros,
  nomeArquivoCertificado,
  normalizarBusca,
  normalizarCodigo,
  parseConteudo,
  periodo,
  proximoStatus,
  statusFormacao
} from '@/lib/dominio/regras';

describe('frequência', () => {
  it('mínimo de encontros = ceil(n × 0,8)', () => {
    expect(minimoEncontros(10)).toBe(8);
    expect(minimoEncontros(8)).toBe(7); // 6,4 → 7
    expect(minimoEncontros(9)).toBe(8); // 7,2 → 8
    expect(minimoEncontros(5)).toBe(4);
  });

  it('não sofre com ponto flutuante (10 × 0,8)', () => {
    expect(minimoEncontros(10, 0.8)).toBe(8);
    expect(minimoEncontros(15, 0.8)).toBe(12);
  });

  it('compara por encontros, não pelo % arredondado', () => {
    // 7 de 9 = 77,8% → arredonda 78; mínimo é 8 encontros
    expect(atingiuMinima(7, 9)).toBe(false);
    expect(atingiuMinima(8, 10)).toBe(true);
    expect(frequenciaPct(9, 10)).toBe(90);
  });

  it('sabe quando não dá mais para atingir', () => {
    expect(aindaPodeAtingir(5, 9, 10)).toBe(false); // 5 + 1 < 8
    expect(aindaPodeAtingir(7, 9, 10)).toBe(true);
  });

  it('carga cumprida proporcional', () => {
    expect(cargaCumprida(60, 9, 10)).toBe(54);
    expect(cargaCumprida(32, 3, 8)).toBe(12);
    expect(cargaCumprida(60, 0, 0)).toBe(0);
  });
});

describe('máquina de estados', () => {
  it('formação aberta → em andamento', () => {
    expect(proximoStatus({ encerrada: false, presencas: 10, totalEncontros: 10, atual: 'liberado_auto' })).toBe(
      'em_andamento'
    );
  });
  it('encerrada e ≥ 80% → liberado automático', () => {
    expect(proximoStatus({ encerrada: true, presencas: 8, totalEncontros: 10, atual: 'em_andamento' })).toBe(
      'liberado_auto'
    );
  });
  it('encerrada e < 80% → em conferência', () => {
    expect(proximoStatus({ encerrada: true, presencas: 7, totalEncontros: 10, atual: 'em_andamento' })).toBe(
      'em_conferencia'
    );
  });
  it('mantém a decisão do gestor se continuar abaixo', () => {
    expect(proximoStatus({ encerrada: true, presencas: 6, totalEncontros: 10, atual: 'recusado' })).toBe('recusado');
    expect(proximoStatus({ encerrada: true, presencas: 6, totalEncontros: 10, atual: 'liberado_validado' })).toBe(
      'liberado_validado'
    );
  });
  it('correção de presença que atinge a mínima libera automaticamente', () => {
    expect(proximoStatus({ encerrada: true, presencas: 9, totalEncontros: 10, atual: 'recusado' })).toBe(
      'liberado_auto'
    );
  });
  it('status da formação', () => {
    expect(statusFormacao(0, 10)).toBe('planejada');
    expect(statusFormacao(4, 10)).toBe('em_andamento');
    expect(statusFormacao(10, 10)).toBe('encerrada');
    expect(statusFormacao(0, 0)).toBe('planejada');
  });
});

describe('códigos e arquivos', () => {
  it('gera código no formato esperado', () => {
    const c = codigoValidacao(2026, 'CNCAMAT', 17, new Uint8Array([0, 1, 31, 10, 20]));
    expect(c).toBe('PNL-2026-CNCAMAT-0017-01ZAM');
  });
  it('normaliza o que foi digitado', () => {
    expect(normalizarCodigo(' pnl 2026_cncamat--0017-01zam ')).toBe('PNL-2026-CNCAMAT-0017-01ZAM');
    expect(normalizarCodigo('pnl-2026-x<script>')).toBe('PNL-2026-XSCRIPT');
  });
  it('nome do arquivo sem acentos', () => {
    expect(nomeArquivoCertificado('Maria Exemplo da Silva', 'MatematicaSupervisores', 54)).toBe(
      'Maria_Exemplo_da_Silva_MatematicaSupervisores_54h.pdf'
    );
    expect(nomeArquivoCertificado('Antônio  Carlos Reis', 'Educação Inclusiva', 30)).toBe(
      'Antonio_Carlos_Reis_EducacaoInclusiva_30h.pdf'
    );
  });
  it('busca sem acentos', () => {
    expect(normalizarBusca('  Antônio CARLOS ')).toBe('antonio carlos');
  });
});

describe('CPF', () => {
  it('valida dígitos', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('529.982.247-26')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('123')).toBe(false);
  });
  it('mascara', () => {
    expect(mascararCpf('529.982.247-25')).toBe('***.982.247-**');
  });
});

describe('conteúdo e datas', () => {
  it('lê módulos e itens', () => {
    expect(parseConteudo('Números\n- Fundamentos\n- Sistema\n\nÁlgebra\n-  Pensamento')).toEqual([
      { titulo: 'Números', itens: ['Fundamentos', 'Sistema'] },
      { titulo: 'Álgebra', itens: ['Pensamento'] }
    ]);
  });
  it('item antes de módulo vira módulo genérico', () => {
    expect(parseConteudo('- Solto')).toEqual([{ titulo: 'Conteúdo', itens: ['Solto'] }]);
  });
  it('datas', () => {
    expect(dataExtenso('2026-10-19')).toBe('19 de outubro de 2026');
    expect(periodo(['2026-10-19', '2026-08-03'])).toBe('03/08/2026 a 19/10/2026');
    expect(periodo([])).toBe('A definir');
  });
});
