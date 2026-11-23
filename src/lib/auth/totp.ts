import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * TOTP (RFC 6238): códigos de 6 dígitos a cada 30 s, compatível com Google Authenticator,
 * Microsoft Authenticator, Authy, 1Password etc. Sem dependências externas.
 */

const PASSO_S = 30;
const DIGITOS = 6;
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function gerarSegredo(bytes = 20): string {
  const b = randomBytes(bytes);
  let bits = 0;
  let valor = 0;
  let out = '';
  for (const byte of b) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALFABETO[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALFABETO[(valor << (5 - bits)) & 31];
  return out;
}

function base32ParaBytes(s: string): Buffer {
  const limpo = s.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let valor = 0;
  const out: number[] = [];
  for (const c of limpo) {
    valor = (valor << 5) | ALFABETO.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function passoAtual(agoraMs = Date.now()): number {
  return Math.floor(agoraMs / 1000 / PASSO_S);
}

export function codigoDoPasso(segredo: string, passo: number): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(passo));
  const h = createHmac('sha1', base32ParaBytes(segredo)).update(contador).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** DIGITOS).padStart(DIGITOS, '0');
}

/**
 * Confere o código aceitando ±1 passo (relógio do celular um pouco adiantado/atrasado).
 * Devolve o passo usado, para impedir que o mesmo código seja reutilizado.
 */
export function conferirCodigo(
  segredo: string,
  codigo: string,
  ultimoPassoUsado: number | null,
  agoraMs = Date.now()
): number | null {
  const c = codigo.replace(/\D/g, '');
  if (c.length !== DIGITOS) return null;
  const atual = passoAtual(agoraMs);
  for (const p of [atual - 1, atual, atual + 1]) {
    if (ultimoPassoUsado !== null && p <= ultimoPassoUsado) continue;
    const esperado = codigoDoPasso(segredo, p);
    if (timingSafeEqual(Buffer.from(esperado), Buffer.from(c))) return p;
  }
  return null;
}

export function uriOtpauth(segredo: string, conta: string, emissor = 'Programa Formar'): string {
  const rotulo = encodeURIComponent(`${emissor}:${conta}`);
  return `otpauth://totp/${rotulo}?secret=${segredo}&issuer=${encodeURIComponent(emissor)}&algorithm=SHA1&digits=${DIGITOS}&period=${PASSO_S}`;
}

/** Códigos de recuperação no formato xxxx-xxxx (sem letras ambíguas). */
export function gerarCodigosRecuperacao(qtd = 10): string[] {
  const alf = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: qtd }, () => {
    const b = randomBytes(8);
    const s = Array.from(b, x => alf[x % alf.length]).join('');
    return `${s.slice(0, 4)}-${s.slice(4)}`;
  });
}

export function normalizarRecuperacao(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}
