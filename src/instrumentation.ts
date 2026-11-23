/** Executa uma vez quando o servidor sobe: liga a rotina de envio de e-mails (modos 'ses' e 'simulado'). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const modo = process.env.EMAIL_MODO;
  if (modo !== 'ses' && modo !== 'simulado') return;
  const { iniciarRotinaEmail } = await import('@/lib/email-envio');
  iniciarRotinaEmail();
}
