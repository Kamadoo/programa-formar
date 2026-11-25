import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

const criadoEm = () => timestamp('criado_em', { withTimezone: true }).notNull().defaultNow();

/* ------------------------------------------------------------------ */
/* Base de servidores (carregada/sincronizada pela SEMED — só leitura) */
/* ------------------------------------------------------------------ */

/**
 * CPF nunca fica em texto puro: guardamos o HMAC (para busca e login) e o valor cifrado (AES-256-GCM).
 * As telas recebem apenas a forma mascarada (***.456.789-**).
 */
export const servidor = pgTable(
  'servidor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nomeCompleto: text('nome_completo').notNull(),
    nomeBusca: text('nome_busca').notNull(), // minúsculas, sem acentos — para a busca por nome
    cpfHash: text('cpf_hash').notNull(),
    cpfCifrado: text('cpf_cifrado').notNull(),
    cpfMascara: text('cpf_mascara').notNull(), // ***.456.789-** (pode ser exibido)
    matricula: text('matricula').notNull(),
    emailInstitucional: text('email_institucional').notNull(),
    funcao: text('funcao'),
    lotacao: text('lotacao'),
    ativo: boolean('ativo').notNull().default(true),
    importadoEm: timestamp('importado_em', { withTimezone: true }),
    // Preenchido só nos registros fictícios de demonstração (scripts/contas-teste.ts): vale até esta data.
    testeAte: timestamp('teste_ate', { withTimezone: true }),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow()
  },
  t => [
    uniqueIndex('servidor_cpf_hash_uq').on(t.cpfHash),
    uniqueIndex('servidor_matricula_uq').on(t.matricula),
    index('servidor_nome_busca_idx').on(t.nomeBusca)
  ]
);

/**
 * Conta do portal do servidor — criada ao vincular a primeira formação.
 * O login é por usuário (gerado no primeiro acesso) + senha + aplicativo autenticador; o CPF só serve para ativar a conta.
 */
export const usuarioPortal = pgTable(
  'usuario_portal',
  {
    servidorId: uuid('servidor_id')
      .primaryKey()
      .references(() => servidor.id, { onDelete: 'cascade' }),
    usuario: text('usuario'), // gerado automaticamente no primeiro acesso (ex.: maria.silva)
    senhaHash: text('senha_hash'), // nulo até o primeiro acesso
    liberadoEm: timestamp('liberado_em', { withTimezone: true }).notNull().defaultNow(),
    primeiroAcessoEm: timestamp('primeiro_acesso_em', { withTimezone: true }), // cadastro concluído
    ultimoLoginEm: timestamp('ultimo_login_em', { withTimezone: true }),
    senhaAlteradaEm: timestamp('senha_alterada_em', { withTimezone: true }),
    totpSegredo: text('totp_segredo'),
    totpPendente: text('totp_pendente'),
    totpAtivadoEm: timestamp('totp_ativado_em', { withTimezone: true }),
    totpUltimoPasso: integer('totp_ultimo_passo')
  },
  t => [uniqueIndex('usuario_portal_usuario_uq').on(t.usuario)]
);

export const perfilGestor = pgEnum('perfil_gestor', ['gestor_nucleo', 'admin']);

export const gestor = pgTable(
  'gestor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    email: text('email').notNull(),
    // Login da gestão (nome.sobrenome, nome.sobrenome2…), gerado ao criar a conta. O e-mail fica para convite e avisos.
    usuario: text('usuario').notNull(),
    senhaHash: text('senha_hash').notNull(),
    // CPF ou CNPJ, escolhido no cadastro: usado só no primeiro acesso (como o CPF do servidor no portal).
    documentoTipo: text('documento_tipo').$type<'cpf' | 'cnpj'>(),
    documentoHash: text('documento_hash'), // HMAC (hashDocumento) — busca sem guardar em claro
    documentoCifrado: text('documento_cifrado'), // AES-GCM, para mostrar mascarado
    primeiroAcessoEm: timestamp('primeiro_acesso_em', { withTimezone: true }), // cadastro concluído (senha + app)
    perfil: perfilGestor('perfil').notNull().default('gestor_nucleo'),
    ativo: boolean('ativo').notNull().default(true),
    // Verificação em duas etapas (TOTP). Segredos sempre cifrados (AES-GCM).
    totpSegredo: text('totp_segredo'),
    totpPendente: text('totp_pendente'),
    totpAtivadoEm: timestamp('totp_ativado_em', { withTimezone: true }),
    totpUltimoPasso: integer('totp_ultimo_passo'), // impede reutilizar o mesmo código
    // Conta de demonstração (scripts/contas-teste.ts): entra sem a segunda etapa e só até esta data.
    testeAte: timestamp('teste_ate', { withTimezone: true }),
    senhaAlteradaEm: timestamp('senha_alterada_em', { withTimezone: true }),
    ultimoLoginEm: timestamp('ultimo_login_em', { withTimezone: true }),
    criadoPor: uuid('criado_por'),
    criadoEm: criadoEm()
  },
  t => [
    uniqueIndex('gestor_email_uq').on(t.email),
    uniqueIndex('gestor_usuario_uq').on(t.usuario),
    uniqueIndex('gestor_documento_uq').on(t.documentoHash)
  ]
);

/* ------------------------------------------------------------------ */
/* Sessões, tokens e proteção contra força bruta                        */
/* ------------------------------------------------------------------ */

export const tipoSessao = pgEnum('tipo_sessao', ['gestor', 'servidor']);
/** 'senha' = só passou pela senha (falta a segunda etapa); 'completa' = acesso liberado. */
export const etapaSessao = pgEnum('etapa_sessao', ['senha', 'completa']);

/** O cookie carrega um token aleatório; o banco guarda só o SHA-256 dele. */
export const sessao = pgTable(
  'sessao',
  {
    tokenHash: text('token_hash').primaryKey(),
    tipo: tipoSessao('tipo').notNull(),
    usuarioId: uuid('usuario_id').notNull(),
    etapa: etapaSessao('etapa').notNull().default('completa'),
    // Segunda etapa conferida nesta sessão (usado entre a ativação e a tela dos códigos de recuperação).
    segundaEtapaOk: boolean('segunda_etapa_ok').notNull().default(false),
    // "Manter conectado neste aparelho": cookie persistente até o próximo corte (4 h) e sem limite de inatividade.
    lembrar: boolean('lembrar').notNull().default(false),
    criadoEm: criadoEm(),
    expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
    ultimoUsoEm: timestamp('ultimo_uso_em', { withTimezone: true }).notNull().defaultNow()
  },
  t => [index('sessao_usuario_idx').on(t.tipo, t.usuarioId)]
);

export const finalidadeToken = pgEnum('finalidade_token', ['primeiro_acesso', 'redefinir_senha']);

export const tokenAcesso = pgTable('token_acesso', {
  tokenHash: text('token_hash').primaryKey(),
  servidorId: uuid('servidor_id')
    .notNull()
    .references(() => servidor.id, { onDelete: 'cascade' }),
  finalidade: finalidadeToken('finalidade').notNull(),
  criadoEm: criadoEm(),
  expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
  usadoEm: timestamp('usado_em', { withTimezone: true })
});

/** Link de uso único para o gestor definir a senha (convite ou redefinição pelo administrador). */
export const tokenGestor = pgTable('token_gestor', {
  tokenHash: text('token_hash').primaryKey(),
  gestorId: uuid('gestor_id')
    .notNull()
    .references(() => gestor.id, { onDelete: 'cascade' }),
  // 'link' = link de senha (administrador criado pelo terminal); 'codigo' = código de 6 dígitos do primeiro acesso.
  tipo: text('tipo').$type<'link' | 'codigo'>().notNull().default('link'),
  criadoEm: criadoEm(),
  expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
  usadoEm: timestamp('usado_em', { withTimezone: true })
});

/** Códigos de recuperação da verificação em duas etapas (só o hash; uso único). */
export const codigoRecuperacao = pgTable(
  'codigo_recuperacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gestorId: uuid('gestor_id')
      .notNull()
      .references(() => gestor.id, { onDelete: 'cascade' }),
    hash: text('hash').notNull(),
    usadoEm: timestamp('usado_em', { withTimezone: true })
  },
  t => [index('codigo_recuperacao_gestor_idx').on(t.gestorId)]
);

/** Códigos de recuperação do autenticador do servidor (só o hash; uso único). */
export const codigoRecuperacaoServidor = pgTable(
  'codigo_recuperacao_servidor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    servidorId: uuid('servidor_id')
      .notNull()
      .references(() => servidor.id, { onDelete: 'cascade' }),
    hash: text('hash').notNull(),
    usadoEm: timestamp('usado_em', { withTimezone: true })
  },
  t => [index('codigo_recuperacao_servidor_idx').on(t.servidorId)]
);

/** Tentativas de login por chave (identificador hasheado) — bloqueio progressivo. */
export const tentativaLogin = pgTable('tentativa_login', {
  chave: text('chave').primaryKey(),
  falhas: integer('falhas').notNull().default(0),
  janelaInicio: timestamp('janela_inicio', { withTimezone: true }).notNull().defaultNow(),
  bloqueadoAte: timestamp('bloqueado_ate', { withTimezone: true })
});

/* ------------------------------------------------------------------ */
/* Formações                                                           */
/* ------------------------------------------------------------------ */

export const statusFormacao = pgEnum('status_formacao', ['planejada', 'em_andamento', 'encerrada']);

export const modeloCertificado = pgTable('modelo_certificado', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  // Assinaturas impressas na frente: [{ nome, cargo }]
  assinaturas: jsonb('assinaturas').$type<{ nome: string; cargo: string }[]>().notNull(),
  cidade: text('cidade').notNull().default('Serra Clara'),
  emUso: boolean('em_uso').notNull().default(true),
  criadoEm: criadoEm()
});

export const formacao = pgTable(
  'formacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    titulo: text('titulo').notNull(),
    tituloCurto: text('titulo_curto').notNull(), // usado no nome do arquivo PDF
    programaEixo: text('programa_eixo').notNull(),
    formador: text('formador').notNull(),
    local: text('local').notNull(),
    cargaPresencialH: integer('carga_presencial_h').notNull(),
    cargaEstudoH: integer('carga_estudo_h').notNull().default(0),
    freqMinima: numeric('freq_minima', { precision: 3, scale: 2 }).notNull().default('0.75'),
    // Legado: o verso do certificado agora é montado a partir dos encontros (módulo, tópico e carga).
    conteudoProgramatico: text('conteudo_programatico').notNull().default(''),
    prefixoCodigo: text('prefixo_codigo').notNull(),
    modeloCertificadoId: uuid('modelo_certificado_id').references(() => modeloCertificado.id),
    status: statusFormacao('status').notNull().default('planejada'),
    criadoPor: uuid('criado_por').references(() => gestor.id),
    criadoEm: criadoEm(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow()
  },
  t => [
    check('formacao_cargas_ck', sql`${t.cargaPresencialH} >= 0 and ${t.cargaEstudoH} >= 0`),
    check('formacao_prefixo_ck', sql`${t.prefixoCodigo} ~ '^[A-Z0-9]{2,12}$'`)
  ]
);

export const encontro = pgTable(
  'encontro',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    formacaoId: uuid('formacao_id')
      .notNull()
      .references(() => formacao.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    data: date('data').notNull(),
    modulo: text('modulo').notNull(),
    topico: text('topico').notNull().default(''),
    // Horas do encontro; vazio = carga presencial dividida igualmente entre os encontros sem carga própria.
    cargaH: numeric('carga_h', { precision: 5, scale: 1 }),
    realizado: boolean('realizado').notNull().default(false),
    lancadoPor: uuid('lancado_por').references(() => gestor.id),
    lancadoEm: timestamp('lancado_em', { withTimezone: true })
  },
  t => [uniqueIndex('encontro_ordem_uq').on(t.formacaoId, t.ordem)]
);

export const statusParticipacao = pgEnum('status_participacao', [
  'em_andamento',
  'liberado_auto',
  'em_conferencia',
  'liberado_validado',
  'recusado'
]);

export const participacao = pgTable(
  'participacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    formacaoId: uuid('formacao_id')
      .notNull()
      .references(() => formacao.id, { onDelete: 'cascade' }),
    servidorId: uuid('servidor_id')
      .notNull()
      .references(() => servidor.id),
    vinculadoEm: timestamp('vinculado_em', { withTimezone: true }).notNull().defaultNow(),
    vinculadoPor: uuid('vinculado_por').references(() => gestor.id),
    status: statusParticipacao('status').notNull().default('em_andamento'),
    decididoPor: uuid('decidido_por').references(() => gestor.id),
    decididoEm: timestamp('decidido_em', { withTimezone: true }),
    motivoRecusa: text('motivo_recusa')
  },
  t => [
    uniqueIndex('participacao_uq').on(t.formacaoId, t.servidorId),
    index('participacao_servidor_idx').on(t.servidorId)
  ]
);

export const presenca = pgTable(
  'presenca',
  {
    participacaoId: uuid('participacao_id')
      .notNull()
      .references(() => participacao.id, { onDelete: 'cascade' }),
    encontroId: uuid('encontro_id')
      .notNull()
      .references(() => encontro.id, { onDelete: 'cascade' }),
    presente: boolean('presente').notNull(),
    lancadoPor: uuid('lancado_por').references(() => gestor.id),
    lancadoEm: timestamp('lancado_em', { withTimezone: true }).notNull().defaultNow()
  },
  t => [primaryKey({ columns: [t.participacaoId, t.encontroId] })]
);

export const certificado = pgTable(
  'certificado',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
      .notNull()
      .references(() => participacao.id, { onDelete: 'cascade' }),
    codigoValidacao: text('codigo_validacao').notNull(),
    cargaCumpridaH: integer('carga_cumprida_h').notNull(),
    frequenciaPct: integer('frequencia_pct').notNull(),
    dataEmissao: date('data_emissao').notNull(),
    emitidoEm: timestamp('emitido_em', { withTimezone: true }).notNull().defaultNow(),
    revogadoEm: timestamp('revogado_em', { withTimezone: true }),
    motivoRevogacao: text('motivo_revogacao')
  },
  t => [
    uniqueIndex('certificado_codigo_uq').on(t.codigoValidacao),
    index('certificado_participacao_idx').on(t.participacaoId)
  ]
);

/* ------------------------------------------------------------------ */
/* Auditoria e e-mails                                                 */
/* ------------------------------------------------------------------ */

/** Registro imutável de quem fez o quê. Não guarda IP nem CPF. */
export const auditoria = pgTable(
  'auditoria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    em: timestamp('em', { withTimezone: true }).notNull().defaultNow(),
    atorTipo: text('ator_tipo').notNull(), // gestor | servidor | sistema | publico
    atorId: uuid('ator_id'),
    acao: text('acao').notNull(),
    entidade: text('entidade').notNull(),
    entidadeId: text('entidade_id'),
    detalhes: jsonb('detalhes').$type<Record<string, unknown>>()
  },
  t => [index('auditoria_em_idx').on(t.em), index('auditoria_entidade_idx').on(t.entidade, t.entidadeId)]
);

/**
 * Fila de e-mails. Em desenvolvimento nada é enviado: as mensagens ficam aqui
 * e podem ser lidas em /dev/emails. Em produção um worker envia via SMTP.
 */
export const emailSaida = pgTable('email_saida', {
  id: uuid('id').primaryKey().defaultRandom(),
  para: text('para').notNull(),
  assunto: text('assunto').notNull(),
  texto: text('texto').notNull(),
  html: text('html'), // versão formatada (src/lib/email-modelos.ts); o texto puro vai junto
  criadoEm: criadoEm(),
  enviadoEm: timestamp('enviado_em', { withTimezone: true }),
  tentativas: integer('tentativas').notNull().default(0),
  proximaTentativaEm: timestamp('proxima_tentativa_em', { withTimezone: true }).notNull().defaultNow(),
  ultimoErro: text('ultimo_erro'),
  desistiuEm: timestamp('desistiu_em', { withTimezone: true }), // depois de várias falhas seguidas
  idProvedor: text('id_provedor') // MessageId do SES, para rastrear
});

/**
 * Convites de primeiro acesso ao portal, enviados pela administração em lote.
 * Uma linha por envio. A situação vem do e-mail na fila (email_saida); quando o e-mail
 * já saiu da fila (limpeza da LGPD), o convite conta como enviado.
 */
export const conviteServidor = pgTable(
  'convite_servidor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    servidorId: uuid('servidor_id')
      .notNull()
      .references(() => servidor.id, { onDelete: 'cascade' }),
    enviadoPor: uuid('enviado_por').references(() => gestor.id, { onDelete: 'set null' }),
    emailId: uuid('email_id'), // sem chave estrangeira: a fila é limpa depois de 30/90 dias
    reenvio: boolean('reenvio').notNull().default(false),
    criadoEm: criadoEm()
  },
  t => [index('convite_servidor_idx').on(t.servidorId, t.criadoEm)]
);
