/**
 * Nomes dos cookies de sessão (sem 'server-only': usados também no proxy).
 * Em produção usam o prefixo __Host- (exige HTTPS, path=/ e nenhum domínio): nenhum subdomínio consegue
 * gravar ou substituir esses cookies. No desenvolvimento local (http) o prefixo não é aceito pelo navegador.
 */
const prefixo = process.env.NODE_ENV === 'production' ? '__Host-' : '';
export const COOKIE_GESTOR = prefixo + 'pf_gestao';
export const COOKIE_SERVIDOR = prefixo + 'pf_portal';
