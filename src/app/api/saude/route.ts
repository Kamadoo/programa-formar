/**
 * Verificação de saúde usada pela AWS para saber se o container está de pé.
 * Não consulta o banco de propósito: uma instabilidade no Supabase não deve
 * fazer a AWS reiniciar o site em sequência.
 */
export function GET() {
  return new Response('ok', { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });
}
