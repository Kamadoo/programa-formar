/** "Manter conectado" vale até as 4 h (Brasília) seguintes, com pelo menos 1 h de folga. */
const CORTE_HORA_BRASILIA = 4;
const CORTE_FOLGA_MS = 3600_000;
const FUSO_BRASILIA_MS = 3 * 3600_000;

export function proximoCorte(agora: number): Date {
  const local = new Date(agora - FUSO_BRASILIA_MS);
  let corte =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), CORTE_HORA_BRASILIA) + FUSO_BRASILIA_MS;
  while (corte - agora < CORTE_FOLGA_MS) corte += 24 * 3600_000;
  return new Date(corte);
}
