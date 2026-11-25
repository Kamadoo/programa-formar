import 'server-only';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';
import { normalizarDocumento, somenteDigitos } from '@/lib/dominio/regras';

/** HMAC-SHA256 do CPF (só dígitos): permite buscar/logar sem guardar o CPF em claro. */
export function hashCpf(cpf: string): string {
  return createHmac('sha256', Buffer.from(env().CPF_HMAC_KEY, 'base64')).update(somenteDigitos(cpf)).digest('hex');
}

/** HMAC-SHA256 do CPF ou CNPJ das contas da gestão (tipo + valor normalizado). */
export function hashDocumento(tipo: 'cpf' | 'cnpj', valor: string): string {
  return createHmac('sha256', Buffer.from(env().CPF_HMAC_KEY, 'base64'))
    .update(`${tipo}:${normalizarDocumento(valor)}`)
    .digest('hex');
}

/** AES-256-GCM. Formato: v1.<iv>.<tag>.<dados> em base64url. */
export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', Buffer.from(env().CPF_ENC_KEY, 'base64'), iv);
  const dados = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), dados.toString('base64url')].join('.');
}

export function decifrar(valor: string): string {
  const [v, iv, tag, dados] = valor.split('.');
  if (v !== 'v1') throw new Error('formato de cifra desconhecido');
  const d = createDecipheriv('aes-256-gcm', Buffer.from(env().CPF_ENC_KEY, 'base64'), Buffer.from(iv, 'base64url'));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([d.update(Buffer.from(dados, 'base64url')), d.final()]).toString('utf8');
}

/**
 * Como `decifrar`, mas devolve null quando o dado não abre (chave CPF_ENC_KEY trocada ou valor corrompido).
 * Registra no log só o contexto, nunca o valor.
 */
export function decifrarOuNulo(valor: string, contexto: string): string | null {
  try {
    return decifrar(valor);
  } catch (e) {
    console.error(`[cripto] não foi possível decifrar (${contexto}): ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

export function tokenAleatorio(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(valor: string): string {
  return createHash('sha256').update(valor).digest('hex');
}

export function iguaisTempoConstante(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
