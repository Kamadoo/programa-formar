/** Resultado padrão das Server Actions, exibido como aviso (toast) no cliente. */
export type Resultado = { ok: boolean; mensagem: string; erros?: Record<string, string>; t: number } | null;

export const sucesso = (mensagem: string): Resultado => ({ ok: true, mensagem, t: Date.now() });
export const falha = (mensagem: string, erros?: Record<string, string>): Resultado => ({
  ok: false,
  mensagem,
  erros,
  t: Date.now()
});
