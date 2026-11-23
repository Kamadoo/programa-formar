/**
 * Dados FICTÍCIOS compartilhados pelo seed (desenvolvimento) e pelas contas de demonstração (scripts/contas-teste.ts).
 */
import { sql } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { cifrar, hashCpf } from '@/lib/cripto';
import { mascararCpf, normalizarBusca } from '@/lib/dominio/regras';
import { recalcular } from '@/lib/dominio/servico';

type Banco = Awaited<ReturnType<typeof db>>;

export const BASE: [string, string, string, string, string, string][] = [
  [
    'Maria Exemplo da Silva',
    '123.456.789-00',
    '00458',
    'maria.silva',
    'Professora — Ensino Fundamental I',
    'EM Vale do Sol'
  ],
  ['Daniel Moura Teixeira', '231.874.560-12', '00512', 'daniel.teixeira', 'Supervisor pedagógico', 'EM Bosque Alto'],
  ['Paulo Henrique Viana', '318.402.967-45', '00627', 'paulo.viana', 'Supervisor pedagógico', 'EM Lagoa Serena'],
  ['Lúcia Fernandes Prado', '402.159.836-70', '00733', 'lucia.prado', 'Supervisora pedagógica', 'EM Vale do Sol'],
  [
    'Cristina Alves Barros',
    '517.236.904-81',
    '00841',
    'cristina.barros',
    'Professora — Ensino Fundamental I',
    'EM Jardim das Acácias'
  ],
  ['Marcos Vinícius Rocha', '603.781.245-09', '00915', 'marcos.rocha', 'Supervisor pedagógico', 'EM Bosque Alto'],
  [
    'Sílvia Andrade Costa',
    '724.390.158-33',
    '01022',
    'silvia.costa',
    'Supervisora pedagógica',
    'EM Jardim das Acácias'
  ],
  [
    'Rafael Nogueira Lima',
    '835.612.407-56',
    '01108',
    'rafael.lima',
    'Professor — Ensino Fundamental I',
    'EM Lagoa Serena'
  ],
  [
    'Juliana Ribeiro Matos',
    '946.027.381-64',
    '01174',
    'juliana.matos',
    'Professora — Educação Infantil',
    'EMEI Recanto Azul'
  ],
  [
    'Antônio Carlos Mendes',
    '158.493.720-27',
    '01236',
    'antonio.mendes',
    'Professor — Ensino Fundamental II',
    'EM Vale do Sol'
  ],
  [
    'Beatriz Souza Pinto',
    '269.508.134-98',
    '01302',
    'beatriz.pinto',
    'Professora — Educação Infantil',
    'EMEI Recanto Azul'
  ],
  [
    'Fernanda Lopes Cardoso',
    '370.615.249-02',
    '01377',
    'fernanda.cardoso',
    'Coordenadora pedagógica',
    'EM Jardim das Acácias'
  ]
];

export type F = {
  titulo: string;
  curto: string;
  prefixo: string;
  eixo: string;
  formador: string;
  local: string;
  pres: number;
  est: number;
  datas: string[];
  modulos: string[];
  realizados: number;
  part: [number, string][]; // índice na BASE (1-based) e presenças "1101…"
  conteudo: string;
  decisoes?: Record<number, 'recusado' | 'liberado_validado'>;
};

const br = (d: string) => d.split('/').reverse().join('-');

export const FORMACOES: F[] = [
  {
    titulo: 'CNCA – Formação de Supervisores – Matemática – 1º e 2º anos',
    curto: 'MatematicaSupervisores',
    prefixo: 'CNCAMAT',
    eixo: 'Compromisso Nacional Criança Alfabetizada',
    formador: 'Helena Martins',
    local: 'Centro de Formação SEMED',
    pres: 40,
    est: 20,
    datas: [
      '03/08/2026',
      '10/08/2026',
      '17/08/2026',
      '24/08/2026',
      '31/08/2026',
      '14/09/2026',
      '21/09/2026',
      '28/09/2026',
      '05/10/2026',
      '19/10/2026'
    ],
    modulos: [
      'Números · fundamentos',
      'Números · sistema de numeração',
      'Números · adição e subtração',
      'Álgebra · pensamento algébrico',
      'Grandezas e medidas I',
      'Grandezas e medidas II',
      'Geometria I',
      'Geometria II',
      'Probabilidade e estatística',
      'Encerramento e avaliação'
    ],
    realizados: 9,
    part: [
      [1, '111110111'],
      [2, '111111111'],
      [3, '110101101'],
      [4, '111111011'],
      [5, '111111111'],
      [6, '101100110'],
      [7, '111101111'],
      [8, '111111110']
    ],
    conteudo:
      'Números\n- Fundamentos do número\n- Sistema de numeração decimal\n- Adição e subtração\nÁlgebra\n- Pensamento algébrico\nGrandezas e Medidas\nGeometria\nProbabilidade e Estatística'
  },
  {
    titulo: 'Educação Inclusiva na Prática – Anos Iniciais',
    curto: 'EducacaoInclusiva',
    prefixo: 'INCL',
    eixo: 'Núcleo de Apoio à Inclusão · SEMED',
    formador: 'Equipe NAPI',
    local: 'Centro de Formação SEMED',
    pres: 24,
    est: 8,
    datas: [
      '22/09/2026',
      '29/09/2026',
      '06/10/2026',
      '13/10/2026',
      '27/10/2026',
      '03/11/2026',
      '10/11/2026',
      '24/11/2026'
    ],
    modulos: [
      'Fundamentos da educação inclusiva',
      'Desenho Universal para a Aprendizagem',
      'PEI na prática',
      'Comunicação alternativa',
      'Adaptação curricular',
      'Tecnologias assistivas',
      'Avaliação inclusiva',
      'Encerramento e partilha'
    ],
    realizados: 4,
    part: [
      [1, '1101'],
      [5, '1111'],
      [9, '1011'],
      [11, '1111'],
      [12, '0111']
    ],
    conteudo:
      'Fundamentos\n- Marcos legais da inclusão\n- Desenho Universal para a Aprendizagem\nPrática pedagógica\n- Plano Educacional Individualizado\n- Comunicação alternativa\n- Adaptação curricular\n- Tecnologias assistivas\nAvaliação inclusiva'
  },
  {
    titulo: 'Pacto Mineiro da Alfabetização – Formação de Professores do 1º e 2º anos',
    curto: 'PactoAlfabetizacao',
    prefixo: 'PACTO',
    eixo: 'Pacto Mineiro pela Alfabetização',
    formador: 'Equipe Pacto Mineiro',
    local: 'EM Vale do Sol',
    pres: 40,
    est: 0,
    datas: [
      '09/03/2026',
      '23/03/2026',
      '06/04/2026',
      '20/04/2026',
      '04/05/2026',
      '18/05/2026',
      '01/06/2026',
      '15/06/2026',
      '06/07/2026',
      '20/07/2026'
    ],
    modulos: [
      'Consciência fonológica',
      'Sistema de escrita alfabética',
      'Leitura e compreensão',
      'Produção de texto',
      'Oralidade',
      'Avaliação diagnóstica',
      'Planejamento',
      'Intervenção pedagógica',
      'Ludicidade e alfabetização',
      'Encerramento'
    ],
    realizados: 10,
    part: [
      [1, '1111111110'],
      [5, '1111111111'],
      [8, '1111011111'],
      [10, '1101101101']
    ],
    conteudo:
      'Alfabetização\n- Consciência fonológica\n- Sistema de escrita alfabética\nLetramento\n- Leitura e compreensão\n- Produção de texto\nPrática\n- Planejamento e intervenção',
    decisoes: { 10: 'recusado' }
  },
  {
    titulo: 'CNCA – Formação de Língua Portuguesa – 3º ao 5º anos',
    curto: 'LinguaPortuguesa',
    prefixo: 'CNCALP',
    eixo: 'Compromisso Nacional Criança Alfabetizada',
    formador: 'Equipe CNCA · SEMED',
    local: 'Centro de Formação SEMED',
    pres: 40,
    est: 20,
    datas: [
      '08/06/2026',
      '15/06/2026',
      '22/06/2026',
      '29/06/2026',
      '03/08/2026',
      '10/08/2026',
      '24/08/2026',
      '31/08/2026'
    ],
    modulos: [
      'Leitura literária',
      'Gêneros textuais',
      'Produção escrita',
      'Revisão textual',
      'Análise linguística',
      'Oralidade',
      'Avaliação',
      'Encerramento'
    ],
    realizados: 8,
    part: [
      [1, '11111111'],
      [12, '11111100'],
      [4, '11111111']
    ],
    conteudo:
      'Leitura\n- Leitura literária\n- Gêneros textuais\nEscrita\n- Produção e revisão\nAnálise linguística\nOralidade'
  }
];

/** Carrega servidores e formações fictícios. Devolve os servidores na ordem da BASE. */
export async function carregarFicticios(
  d: Banco,
  gestorId: string,
  modeloId: string,
  opcoes: { email: (usuario: string) => string; testeAte?: Date }
) {
  const gestorRow = { id: gestorId };
  const modelo = { id: modeloId };
  const servidores = await d
    .insert(s.servidor)
    .values(
      BASE.map(([nome, cpf, mat, email, funcao, lotacao]) => ({
        nomeCompleto: nome,
        nomeBusca: normalizarBusca(nome),
        cpfHash: hashCpf(cpf),
        cpfCifrado: cifrar(cpf.replace(/\D/g, '')),
        cpfMascara: mascararCpf(cpf),
        matricula: mat,
        emailInstitucional: opcoes.email(email),
        testeAte: opcoes.testeAte ?? null,
        funcao,
        lotacao
      }))
    )
    .returning({ id: s.servidor.id });

  for (const f of FORMACOES) {
    await d.transaction(async tx => {
      const [fr] = await tx
        .insert(s.formacao)
        .values({
          titulo: f.titulo,
          tituloCurto: f.curto,
          programaEixo: f.eixo,
          formador: f.formador,
          local: f.local,
          cargaPresencialH: f.pres,
          cargaEstudoH: f.est,
          conteudoProgramatico: f.conteudo,
          prefixoCodigo: f.prefixo,
          modeloCertificadoId: modelo.id,
          criadoPor: gestorRow.id
        })
        .returning({ id: s.formacao.id });
      const encs = await tx
        .insert(s.encontro)
        .values(
          f.datas.map((dt, i) => ({
            formacaoId: fr.id,
            ordem: i + 1,
            data: br(dt),
            modulo: f.modulos[i],
            realizado: i < f.realizados,
            lancadoPor: i < f.realizados ? gestorRow.id : null,
            lancadoEm: i < f.realizados ? new Date() : null
          }))
        )
        .returning({ id: s.encontro.id });
      for (const [idx, pres] of f.part) {
        const servidorId = servidores[idx - 1].id;
        const [p] = await tx
          .insert(s.participacao)
          .values({ formacaoId: fr.id, servidorId, vinculadoPor: gestorRow.id })
          .returning({ id: s.participacao.id });
        await tx.insert(s.usuarioPortal).values({ servidorId }).onConflictDoNothing();
        const vals = pres.split('').map((c, i) => ({
          participacaoId: p.id,
          encontroId: encs[i].id,
          presente: c === '1',
          lancadoPor: gestorRow.id
        }));
        if (vals.length) await tx.insert(s.presenca).values(vals);
      }
      await recalcular(tx, fr.id, null);
      for (const [idx, dec] of Object.entries(f.decisoes ?? {})) {
        await tx
          .update(s.participacao)
          .set({ status: dec, decididoPor: gestorRow.id, decididoEm: new Date() })
          .where(
            sql`${s.participacao.formacaoId} = ${fr.id} and ${s.participacao.servidorId} = ${servidores[Number(idx) - 1].id}`
          );
      }
    });
  }

  return servidores;
}
