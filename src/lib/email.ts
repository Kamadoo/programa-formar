import 'server-only';
import { db, schema, type Tx } from '@/db';
import { env } from '@/lib/env';
import { emailCodigo, emailConvite, emailSenhaAlterada, htmlDeTexto, type Finalidade } from '@/lib/email-modelos';
import { primeiroNome } from '@/lib/dominio/regras';

/**
 * Enfileira um e-mail. Em desenvolvimento nada sai da máquina: as mensagens
 * ficam na tabela email_saida e podem ser lidas em /dev/emails.
 */
export async function enfileirarEmail(
  para: string,
  assunto: string,
  texto: string,
  tx?: Tx,
  html?: string
): Promise<string | null> {
  // Endereços .test são fictícios (contas de demonstração): nunca vão para a fila, para não gerar devolução no SES.
  if (/\.test$/i.test(para.trim())) return null;
  const alvo = tx ?? (await db());
  // Sem modelo próprio, o texto vira HTML na moldura padrão (marca + rodapé institucional).
  const corpoHtml = html ?? htmlDeTexto(assunto, texto, env().SITE_URL);
  const [r] = await alvo
    .insert(schema.emailSaida)
    .values({ para, assunto, texto: texto + rodape(), html: corpoHtml })
    .returning({ id: schema.emailSaida.id });
  return r.id;
}

function rodape() {
  return (
    '\n\n—\nPrograma Formar · Secretaria Municipal de Educação de Serra Clara\n' +
    env().SITE_URL +
    '\nEste é um aviso automático; não responda este e-mail.'
  );
}

export function link(caminho: string) {
  return new URL(caminho, env().SITE_URL).toString();
}

/** E-mail com o código de 6 números (primeiro acesso ou nova senha), no modelo próprio. */
export async function enfileirarCodigo(
  para: string,
  nomeCompleto: string,
  codigo: string,
  finalidade: Finalidade,
  minutos: number,
  tx?: Tx,
  area: 'portal' | 'gestao' = 'portal'
) {
  const m = emailCodigo({
    nome: primeiroNome(nomeCompleto),
    codigo,
    finalidade,
    minutos,
    siteUrl: env().SITE_URL,
    area
  });
  await enfileirarEmail(para, m.assunto, m.texto, tx, m.html);
}

/** Aviso de senha alterada (para a pessoa perceber se não foi ela). */
export async function avisarSenhaAlterada(para: string, nomeCompleto: string, area: 'portal' | 'gestao', tx?: Tx) {
  const m = emailSenhaAlterada({ nome: primeiroNome(nomeCompleto), quando: new Date(), siteUrl: env().SITE_URL, area });
  await enfileirarEmail(para, m.assunto, m.texto, tx, m.html);
}

/** Convite de primeiro acesso ao portal. Devolve o id do e-mail na fila (nulo para endereços fictícios). */
export async function enfileirarConvite(para: string, nomeCompleto: string, tx?: Tx) {
  const m = emailConvite({ nome: primeiroNome(nomeCompleto), siteUrl: env().SITE_URL });
  return enfileirarEmail(para, m.assunto, m.texto, tx, m.html);
}
