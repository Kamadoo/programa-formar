import 'server-only';
import { and, desc, eq, gte, lt, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, schema as s } from '@/db';

/** Nomes legíveis das ações registradas. */
export const ACOES: Record<string, string> = {
  senha_ok: 'Senha conferida (1ª etapa)',
  login: 'Entrou no sistema',
  falha_2fa: 'Código de verificação incorreto',
  ativar_2fa: 'Ativou a verificação em duas etapas',
  novos_codigos_recuperacao: 'Gerou novos códigos de recuperação',
  trocar_senha: 'Trocou a senha',
  definir_senha: 'Definiu a senha pelo link',
  solicitar_link: 'Pediu link de senha',
  criar: 'Criou formação',
  editar: 'Editou formação',
  adicionar_encontro: 'Adicionou encontro',
  remover_encontro: 'Removeu encontro',
  vincular: 'Vinculou servidor',
  desvincular: 'Removeu servidor da formação',
  lancar_encontro: 'Lançou encontro',
  marcar_presenca: 'Marcou presença',
  marcar_falta: 'Marcou falta',
  status: 'Status recalculado',
  validar: 'Validou certificado',
  recusar: 'Recusou certificado',
  emitir: 'Certificado emitido',
  revogar: 'Certificado cancelado',
  ver_pdf: 'Abriu PDF de certificado',
  baixar_pdf: 'Baixou o próprio certificado',
  imprimir_lista: 'Gerou lista de presença',
  validar_ok: 'Validação pública (encontrado)',
  validar_inexistente: 'Validação pública (não encontrado)',
  criar_gestor: 'Criou conta da gestão',
  enviar_link_senha_gestor: 'Enviou link de senha a gestor',
  desativar_gestor: 'Desativou conta da gestão',
  reativar_gestor: 'Reativou conta da gestão',
  redefinir_2fa_gestor: 'Redefiniu a verificação de um gestor',
  encerrar_sessoes_gestor: 'Encerrou sessões de um gestor',
  importar_servidores: 'Importou base de servidores',
  alterar_servidor: 'Alterou servidor da base',
  editar_encontro: 'Editou encontro',
  desfazer_lancamento: 'Desfez lançamento de encontro',
  excluir_formacao: 'Excluiu formação',
  exportar_auditoria: 'Exportou a auditoria',
  criar_admin: 'Administrador criado pelo terminal',
  recuperar_admin: 'Acesso de administrador recuperado pelo terminal',
  remover_admin: 'Conta de administrador criada por engano removida pelo terminal',
  reenviar_emails: 'Devolveu e-mails com falha para a fila'
};

export type FiltroAuditoria = {
  de?: string;
  ate?: string;
  atorTipo?: string;
  atorId?: string;
  acao?: string;
  pagina?: number;
};

export const POR_PAGINA = 50;

export async function consultarAuditoria(f: FiltroAuditoria, limite = POR_PAGINA) {
  const d = await db();
  const g = alias(s.gestor, 'g');
  const sv = alias(s.servidor, 'sv');
  const cond: SQL[] = [];
  const data = /^\d{4}-\d{2}-\d{2}$/;
  if (f.de && data.test(f.de)) cond.push(gte(s.auditoria.em, sql`${f.de}::date`));
  if (f.ate && data.test(f.ate)) cond.push(lt(s.auditoria.em, sql`${f.ate}::date + 1`));
  if (f.atorTipo && ['gestor', 'servidor', 'sistema', 'publico'].includes(f.atorTipo))
    cond.push(eq(s.auditoria.atorTipo, f.atorTipo));
  if (f.atorId && /^[0-9a-f-]{36}$/i.test(f.atorId)) cond.push(eq(s.auditoria.atorId, f.atorId));
  if (f.acao && f.acao in ACOES) cond.push(eq(s.auditoria.acao, f.acao));
  const onde = cond.length ? and(...cond) : undefined;
  const pagina = Math.max(1, Math.min(f.pagina ?? 1, 10_000));

  const [{ total }] = await d
    .select({ total: sql<number>`count(*)::int` })
    .from(s.auditoria)
    .where(onde);
  const linhas = await d
    .select({
      id: s.auditoria.id,
      em: s.auditoria.em,
      atorTipo: s.auditoria.atorTipo,
      atorId: s.auditoria.atorId,
      acao: s.auditoria.acao,
      entidade: s.auditoria.entidade,
      entidadeId: s.auditoria.entidadeId,
      detalhes: s.auditoria.detalhes,
      gestorNome: g.nome,
      servidorNome: sv.nomeCompleto
    })
    .from(s.auditoria)
    .leftJoin(g, and(eq(s.auditoria.atorTipo, 'gestor'), eq(g.id, s.auditoria.atorId)))
    .leftJoin(sv, and(eq(s.auditoria.atorTipo, 'servidor'), eq(sv.id, s.auditoria.atorId)))
    .where(onde)
    .orderBy(desc(s.auditoria.em))
    .limit(limite)
    .offset((pagina - 1) * limite);

  return {
    total,
    pagina,
    paginas: Math.max(1, Math.ceil(total / limite)),
    linhas: linhas.map(l => ({
      ...l,
      ator:
        l.gestorNome ??
        l.servidorNome ??
        (l.atorTipo === 'publico' ? 'Visitante' : l.atorTipo === 'sistema' ? 'Sistema' : '—'),
      acaoTexto: ACOES[l.acao] ?? l.acao
    }))
  };
}

/** Resumo legível dos detalhes (sem expor identificadores internos longos). */
export function resumoDetalhes(det: Record<string, unknown> | null): string {
  if (!det) return '';
  return Object.entries(det)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ')
    .slice(0, 300);
}
