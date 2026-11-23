import 'server-only';
import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

// Argon2id com parâmetros recomendados pela OWASP (19 MiB, 2 iterações).
const OPCOES = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function gerarHashSenha(senha: string): Promise<string> {
  return hash(senha, OPCOES);
}

export async function conferirSenha(hashSalvo: string | null | undefined, senha: string): Promise<boolean> {
  // Sem hash (conta inexistente ou sem senha): faz o trabalho mesmo assim para não revelar pelo tempo.
  const alvo = hashSalvo ?? (await hashFalso());
  try {
    const ok = await verify(alvo, senha);
    return ok && Boolean(hashSalvo);
  } catch {
    return false;
  }
}

// Hash de uma senha aleatória descartada — usado só para igualar o tempo de resposta.
let falso: Promise<string> | null = null;
function hashFalso() {
  falso ??= hash(randomBytes(24).toString('base64'), OPCOES);
  return falso;
}

/** Política: 10+ caracteres, com letras e números; bloqueia sequências óbvias. */
export function problemaSenha(senha: string): string | null {
  if (senha.length < 10) return 'A senha precisa ter pelo menos 10 caracteres.';
  if (senha.length > 128) return 'A senha pode ter no máximo 128 caracteres.';
  if (!/[A-Za-zÀ-ÿ]/.test(senha) || !/\d/.test(senha)) return 'Use letras e números na senha.';
  if (/^(.)\1+$/.test(senha) || /(0123456789|1234567890|abcdefghij|qwertyuiop)/i.test(senha)) {
    return 'Essa senha é fácil de adivinhar. Escolha outra.';
  }
  return null;
}
