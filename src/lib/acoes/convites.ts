'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { falha, sucesso, type Resultado } from '@/lib/acao';
import { auditar } from '@/lib/auditoria';
import { exigirAdmin } from '@/lib/auth/sessao';
import { MAX_CONVITES_POR_ENVIO } from '@/lib/dominio/convites-filtros';
import { enviarConvites } from '@/lib/dominio/convites';

const uuid = z.string().uuid();

/** Envia o convite de primeiro acesso às contas marcadas na aba Convites. */
export async function enviarConvitesPortal(_: Resultado, form: FormData): Promise<Resultado> {
  const adm = await exigirAdmin();
  const ids = form.getAll('ids').map(String);
  if (!ids.length) return falha('Marque ao menos uma pessoa.');
  if (ids.length > MAX_CONVITES_POR_ENVIO) return falha(`Envie no máximo ${MAX_CONVITES_POR_ENVIO} convites por vez.`);
  if (!ids.every(id => uuid.safeParse(id).success)) return falha('Seleção inválida. Recarregue a página.');
  const reenviar = form.get('reenviar') === '1';

  const r = await enviarConvites(adm.id, ids, reenviar);
  await auditar({
    atorTipo: 'gestor',
    atorId: adm.id,
    acao: 'enviar_convites_portal',
    entidade: 'servidor',
    detalhes: { selecionados: ids.length, reenviar, ...r }
  });
  revalidatePath('/gestao/admin/convites');
  revalidatePath('/gestao/admin/servidores');

  const partes = [
    r.jaEnviados ? `${r.jaEnviados} já tinha(m) recebido (marque “Reenviar” para mandar de novo)` : '',
    r.naFila ? `${r.naFila} ainda na fila de envio` : '',
    r.indisponiveis ? `${r.indisponiveis} sem condição de receber (já ativou, desativado ou e-mail inválido)` : ''
  ].filter(Boolean);
  const extra = partes.length ? ` ${partes.join('; ')}.` : '';
  if (!r.enviados) return falha(`Nenhum convite enviado.${extra}`);
  return sucesso(`${r.enviados} convite(s) na fila de envio.${extra}`);
}
