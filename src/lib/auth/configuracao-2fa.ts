import 'server-only';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { db, schema as s } from '@/db';
import { cifrar, decifrarOuNulo } from '@/lib/cripto';
import { gerarSegredo, uriOtpauth } from './totp';

// Fica fora de 'use server' de propósito: não pode virar uma ação chamável pelo navegador.
/** Segredo pendente (cria se ainda não houver) + QR code para o aplicativo autenticador. */
export async function prepararConfiguracao(gestorId: string, usuario: string) {
  const d = await db();
  const [g] = await d
    .select({ pendente: s.gestor.totpPendente })
    .from(s.gestor)
    .where(eq(s.gestor.id, gestorId))
    .limit(1);
  let segredo = g?.pendente ? decifrarOuNulo(g.pendente, 'totp pendente gestor') : null;
  if (!segredo) {
    segredo = gerarSegredo();
    await d
      .update(s.gestor)
      .set({ totpPendente: cifrar(segredo) })
      .where(eq(s.gestor.id, gestorId));
  }
  const qr = await QRCode.toString(uriOtpauth(segredo, usuario), { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  return {
    segredoFormatado: segredo.match(/.{1,4}/g)!.join(' '),
    qrDataUri: 'data:image/svg+xml;base64,' + Buffer.from(qr).toString('base64')
  };
}

/** O mesmo para o servidor (portal), no primeiro acesso. A conta no aplicativo aparece com o usuário gerado. */
export async function prepararConfiguracaoServidor(servidorId: string, usuario: string) {
  const d = await db();
  const [c] = await d
    .select({ pendente: s.usuarioPortal.totpPendente })
    .from(s.usuarioPortal)
    .where(eq(s.usuarioPortal.servidorId, servidorId))
    .limit(1);
  let segredo = c?.pendente ? decifrarOuNulo(c.pendente, 'totp pendente servidor') : null;
  if (!segredo) {
    segredo = gerarSegredo();
    await d
      .update(s.usuarioPortal)
      .set({ totpPendente: cifrar(segredo) })
      .where(eq(s.usuarioPortal.servidorId, servidorId));
  }
  const qr = await QRCode.toString(uriOtpauth(segredo, usuario), { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  return {
    segredoFormatado: segredo.match(/.{1,4}/g)!.join(' '),
    qrDataUri: 'data:image/svg+xml;base64,' + Buffer.from(qr).toString('base64')
  };
}
