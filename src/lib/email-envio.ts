import 'server-only';
import { and, eq, isNotNull, isNull, lt, lte, sql } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { env } from '@/lib/env';
import { erroPermanente, esperaMinutos, MAX_TENTATIVAS, resumoErro } from './email-fila';

type Mensagem = { para: string; assunto: string; texto: string; html?: string | null };
type Remessa = (m: Mensagem) => Promise<string | undefined>;

let remessaSes: Remessa | null = null;

async function remessa(): Promise<Remessa | null> {
  const e = env();
  if (e.EMAIL_MODO === 'simulado') {
    return async m => {
      console.log(`[e-mail simulado] para=${m.para.replace(/(.).*@/, '$1***@')} assunto="${m.assunto}"`);
      return 'simulado';
    };
  }
  if (e.EMAIL_MODO !== 'ses') return null;
  if (!remessaSes) {
    const { SESv2Client, SendEmailCommand } = await import('@aws-sdk/client-sesv2');
    const cliente = new SESv2Client({
      region: e.SES_REGIAO,
      credentials: { accessKeyId: e.SES_ACCESS_KEY_ID!, secretAccessKey: e.SES_SECRET_ACCESS_KEY! }
    });
    remessaSes = async m => {
      const r = await cliente.send(
        new SendEmailCommand({
          FromEmailAddress: e.SES_REMETENTE,
          Destination: { ToAddresses: [m.para] },
          Content: {
            Simple: {
              Subject: { Data: m.assunto, Charset: 'UTF-8' },
              Body: {
                Text: { Data: m.texto, Charset: 'UTF-8' },
                ...(m.html ? { Html: { Data: m.html, Charset: 'UTF-8' } } : {})
              }
            }
          }
        })
      );
      return r.MessageId;
    };
  }
  return remessaSes;
}

/**
 * Envia um lote da fila. Reserva as mensagens antes de enviar (SKIP LOCKED), então duas
 * instâncias do site rodando ao mesmo tempo não mandam o mesmo e-mail duas vezes.
 */
export async function processarFila(limite = 20): Promise<{ enviados: number; falhas: number }> {
  const enviar = await remessa();
  if (!enviar) return { enviados: 0, falhas: 0 };
  const d = await db();
  type Linha = { id: string; para: string; assunto: string; texto: string; html: string | null; tentativas: number };
  const reservados = await d.execute(sql`
    update ${s.emailSaida} set proxima_tentativa_em = now() + interval '5 minutes'
    where id in (
      select id from ${s.emailSaida}
      where enviado_em is null and desistiu_em is null and proxima_tentativa_em <= now()
      order by criado_em
      limit ${limite}
      for update skip locked
    )
    returning id, para, assunto, texto, html, tentativas`);
  // node-postgres e PGlite devolvem { rows }.
  const linhas = (reservados as unknown as { rows: Linha[] }).rows;

  let enviados = 0;
  let falhas = 0;
  for (const m of linhas) {
    try {
      const idProvedor = await enviar(m);
      await d
        .update(s.emailSaida)
        .set({ enviadoEm: new Date(), idProvedor: idProvedor ?? null, ultimoErro: null })
        .where(eq(s.emailSaida.id, m.id));
      enviados++;
    } catch (e) {
      falhas++;
      const tentativas = m.tentativas + 1;
      const desistir = tentativas >= MAX_TENTATIVAS || erroPermanente(e instanceof Error ? e.name : undefined);
      await d
        .update(s.emailSaida)
        .set({
          tentativas,
          ultimoErro: resumoErro(e),
          proximaTentativaEm: new Date(Date.now() + esperaMinutos(tentativas) * 60_000),
          desistiuEm: desistir ? new Date() : null
        })
        .where(eq(s.emailSaida.id, m.id));
      console.error(`[e-mail] falha (${tentativas}ª): ${resumoErro(e)}`);
    }
  }
  return { enviados, falhas };
}

/** LGPD: e-mails enviados saem da fila após 30 dias; os que falharam de vez, após 90. */
export async function limparFila() {
  const d = await db();
  const dia = 86_400_000;
  await d
    .delete(s.emailSaida)
    .where(and(isNotNull(s.emailSaida.enviadoEm), lt(s.emailSaida.enviadoEm, new Date(Date.now() - 30 * dia))));
  await d
    .delete(s.emailSaida)
    .where(and(isNotNull(s.emailSaida.desistiuEm), lt(s.emailSaida.desistiuEm, new Date(Date.now() - 90 * dia))));
}

/** Volta para a fila os e-mails que desistiram (botão da administração). */
export async function reenviarFalhas() {
  const d = await db();
  const r = await d
    .update(s.emailSaida)
    .set({ desistiuEm: null, tentativas: 0, proximaTentativaEm: new Date() })
    .where(and(isNull(s.emailSaida.enviadoEm), isNotNull(s.emailSaida.desistiuEm)))
    .returning({ id: s.emailSaida.id });
  return r.length;
}

export async function resumoFila() {
  const d = await db();
  const [r] = await d
    .select({
      pendentes: sql<number>`count(*) filter (where ${s.emailSaida.enviadoEm} is null and ${s.emailSaida.desistiuEm} is null)::int`,
      comFalha: sql<number>`count(*) filter (where ${s.emailSaida.enviadoEm} is null and ${s.emailSaida.desistiuEm} is null and ${s.emailSaida.tentativas} > 0)::int`,
      desistidos: sql<number>`count(*) filter (where ${s.emailSaida.desistiuEm} is not null and ${s.emailSaida.enviadoEm} is null)::int`,
      enviados24h: sql<number>`count(*) filter (where ${s.emailSaida.enviadoEm} > now() - interval '24 hours')::int`
    })
    .from(s.emailSaida);
  const atrasado = await d
    .select({ n: sql<number>`count(*)::int` })
    .from(s.emailSaida)
    .where(
      and(
        isNull(s.emailSaida.enviadoEm),
        isNull(s.emailSaida.desistiuEm),
        lte(s.emailSaida.criadoEm, new Date(Date.now() - 15 * 60_000))
      )
    );
  return { ...r, atrasados: atrasado[0]?.n ?? 0, modo: env().EMAIL_MODO };
}

const g = globalThis as unknown as { __formarRotinaEmail?: boolean };

/** Rotina em segundo plano: tenta enviar a cada 10 s e limpa a fila uma vez por hora. */
export function iniciarRotinaEmail() {
  if (g.__formarRotinaEmail) return;
  g.__formarRotinaEmail = true;
  let ocupado = false;
  let ultimaLimpeza = 0;
  const ciclo = async () => {
    if (ocupado) return;
    ocupado = true;
    try {
      await processarFila();
      if (Date.now() - ultimaLimpeza > 3600_000) {
        await limparFila();
        ultimaLimpeza = Date.now();
      }
    } catch (e) {
      console.error('[e-mail] erro na rotina:', resumoErro(e));
    } finally {
      ocupado = false;
    }
  };
  setInterval(ciclo, 10_000).unref?.();
  void ciclo();
  console.log(`[e-mail] rotina de envio iniciada (modo ${env().EMAIL_MODO}).`);
}
