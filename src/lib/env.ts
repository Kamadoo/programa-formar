import 'server-only';
import { z } from 'zod';

const chave32 = z
  .string()
  .refine(v => Buffer.from(v, 'base64').length === 32, 'precisa ter 32 bytes em base64 (rode npm run setup)');

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url().optional(),
  PGLITE_DIR: z.string().default('.data/pglite'),
  CPF_HMAC_KEY: chave32,
  CPF_ENC_KEY: chave32,
  SITE_URL: z.string().url().default('http://localhost:3000'),
  // E-mail: 'fila' = só guarda (desenvolvimento; ver /dev/emails), 'simulado' = marca como enviado e
  // registra no log (teste da rotina), 'ses' = envia de verdade pelo Amazon SES.
  EMAIL_MODO: z.enum(['fila', 'simulado', 'ses']).default('fila'),
  SES_REGIAO: z.string().default('sa-east-1'),
  SES_REMETENTE: z.string().optional(),
  SES_ACCESS_KEY_ID: z.string().optional(),
  SES_SECRET_ACCESS_KEY: z.string().optional()
});

let cache: z.infer<typeof esquema> | null = null;

/** Variáveis de ambiente validadas. Falha cedo, com mensagem clara, se faltar algo. */
export function env() {
  if (!cache) {
    const r = esquema.safeParse(process.env);
    if (!r.success) {
      throw new Error(
        'Configuração inválida:\n' + r.error.issues.map(i => `- ${i.path.join('.')}: ${i.message}`).join('\n')
      );
    }
    if (r.data.NODE_ENV === 'production' && !r.data.DATABASE_URL) {
      throw new Error('DATABASE_URL é obrigatória em produção.');
    }
    if (
      r.data.EMAIL_MODO === 'ses' &&
      (!r.data.SES_REMETENTE || !r.data.SES_ACCESS_KEY_ID || !r.data.SES_SECRET_ACCESS_KEY)
    ) {
      throw new Error('EMAIL_MODO=ses exige SES_REMETENTE, SES_ACCESS_KEY_ID e SES_SECRET_ACCESS_KEY.');
    }
    cache = r.data;
  }
  return cache;
}
