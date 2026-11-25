import { describe, expect, it } from 'vitest';
import {
  aindaPodeAtingir,
  atingiuMinima,
  conteudoDosEncontros,
  FREQ_CONFERENCIA,
  horasTexto,
  prefixoCodigo,
  vaiParaConferencia,
  cargaCumprida,
  codigoValidacao,
  cnpjValido,
  cpfValido,
  documentoValido,
  mascararDocumento,
  tipoDocumento,
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
  it('mínimo de encontros = ceil(n × 0,75)', () => {
    expect(minimoEncontros(10)).toBe(8); // 7,5 → 8
    expect(minimoEncontros(8)).toBe(6);
    expect(minimoEncontros(9)).toBe(7); // 6,75 → 7
    expect(minimoEncontros(4)).toBe(3);
  });

  it('piso da conferência = ceil(n × 0,6)', () => {
    expect(minimoEncontros(10, FREQ_CONFERENCIA)).toBe(6);
    expect(vaiParaConferencia(6, 10)).toBe(true); // 60%
    expect(vaiParaConferencia(7, 10)).toBe(true); // 70%
    expect(vaiParaConferencia(8, 10)).toBe(false); // 80%: automático
    expect(vaiParaConferencia(5, 10)).toBe(false); // 50%: sem certificado
  });

  it('não sofre com ponto flutuante (10 × 0,8)', () => {
    expect(minimoEncontros(10, 0.8)).toBe(8);
    expect(minimoEncontros(15, 0.8)).toBe(12);
  });

  it('compara por encontros, não pelo % arredondado', () => {
    // 7 de 10 = 70%; 6 de 8 = 75% (exato)
    expect(atingiuMinima(7, 10)).toBe(false);
    expect(atingiuMinima(6, 8)).toBe(true);
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
  it('encerrada e ≥ 75% → liberado automático', () => {
    expect(proximoStatus({ encerrada: true, presencas: 8, totalEncontros: 10, atual: 'em_andamento' })).toBe(
      'liberado_auto'
    );
  });
  it('encerrada e entre 60% e 75% → em conferência', () => {
    expect(proximoStatus({ encerrada: true, presencas: 7, totalEncontros: 10, atual: 'em_andamento' })).toBe(
      'em_conferencia'
    );
  });
  it('encerrada e abaixo de 60% → recusado (sem certificado)', () => {
    expect(proximoStatus({ encerrada: true, presencas: 5, totalEncontros: 10, atual: 'em_andamento' })).toBe(
      'recusado'
    );
    expect(proximoStatus({ encerrada: true, presencas: 5, totalEncontros: 10, atual: 'liberado_validado' })).toBe(
      'recusado'
    );
  });
  it('mantém a decisão do gestor se continuar na faixa de conferência', () => {
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

describe('prefixo e conteúdo programático', () => {
  it('prefixo a partir do programa/eixo e do nome curto', () => {
    expect(prefixoCodigo('Compromisso Nacional Criança Alfabetizada', 'MatematicaSupervisores')).toBe('CNCAMAT');
    expect(prefixoCodigo('CNCA', 'Língua Portuguesa')).toBe('CNCALIN');
    expect(prefixoCodigo('Núcleo de Apoio à Inclusão · SEMED', 'Educacao Inclusiva')).toBe('NAAISEDU');
  });
  it('agrupa encontros por módulo, somando a carga', () => {
    const m = conteudoDosEncontros(
      [
        { modulo: 'Números', topico: 'fundamentos', cargaH: null },
        { modulo: 'números', topico: 'Sistema decimal', cargaH: null },
        { modulo: 'Álgebra', topico: '', cargaH: 2 },
        { modulo: 'Números', topico: 'Fundamentos', cargaH: null }
      ],
      14
    );
    expect(m.map(x => [x.titulo, x.cargaH])).toEqual([
      ['Números', 12],
      ['Álgebra', 2]
    ]);
    expect(m[0].itens).toEqual(['fundamentos', 'Sistema decimal']);
    expect(m[0].cargasItens).toEqual([8, 4]);
    expect(horasTexto(2.5)).toBe('2,5');
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

describe('CPF ou CNPJ', () => {
  it('reconhece o tipo pelo tamanho', () => {
    expect(tipoDocumento('529.982.247-25')).toBe('cpf');
    expect(tipoDocumento('11.222.333/0001-81')).toBe('cnpj');
    expect(tipoDocumento('12.abc.345/01de-35')).toBe('cnpj');
    expect(tipoDocumento('1234')).toBeNull();
  });
  it('valida CNPJ numérico e alfanumérico', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11.222.333/0001-82')).toBe(false);
    expect(cnpjValido('12.ABC.345/01DE-35')).toBe(true);
    expect(cnpjValido('12abc34501de35')).toBe(true);
    expect(cnpjValido('12.ABC.345/01DE-36')).toBe(false);
    expect(cnpjValido('00.000.000/0000-00')).toBe(false);
  });
  it('confere o documento conforme o tipo escolhido', () => {
    expect(documentoValido('cpf', '529.982.247-25')).toBe(true);
    expect(documentoValido('cpf', '11.222.333/0001-81')).toBe(false);
    expect(documentoValido('cnpj', '529.982.247-25')).toBe(false);
  });
  it('mascara', () => {
    expect(mascararDocumento('cpf', '52998224725')).toBe('***.982.247-**');
    expect(mascararDocumento('cnpj', '11222333000181')).toBe('**.222.333/****-**');
  });
});
