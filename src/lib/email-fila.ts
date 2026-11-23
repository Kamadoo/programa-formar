/** Regras puras da fila de e-mails (testadas em tests/unit). */

export const MAX_TENTATIVAS = 6;
const ESPERA_MIN = [1, 5, 15, 60, 240];

/** Minutos até a próxima tentativa depois de `tentativas` falhas (1, 5, 15, 60, 240…). */
export function esperaMinutos(tentativas: number): number {
  return ESPERA_MIN[Math.min(Math.max(tentativas, 1), ESPERA_MIN.length) - 1];
}

/** Erros que não adianta repetir (endereço inválido, remetente não verificado, mensagem recusada). */
export function erroPermanente(nome: string | undefined): boolean {
  return ['MessageRejected', 'MailFromDomainNotVerifiedException', 'BadRequestException', 'NotFoundException'].includes(
    nome ?? ''
  );
}

/** Texto do erro sem dados sensíveis e com tamanho limitado, para guardar no banco. */
export function resumoErro(e: unknown): string {
  const nome = e instanceof Error ? e.name : 'Erro';
  const msg = e instanceof Error ? e.message : String(e);
  return `${nome}: ${msg}`.replace(/AKIA[0-9A-Z]{12,}/g, '[chave]').slice(0, 300);
}
