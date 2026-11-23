import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_GESTOR, COOKIE_SERVIDOR } from '@/lib/auth/cookies';

/** Cabeçalho que a Cloudflare acrescenta (Transform Rule) em toda requisição enviada à AWS. */
const CABECALHO_ORIGEM = 'x-origem-formar';

function veioDaCloudflare(request: NextRequest): boolean {
  const esperado = process.env.ORIGEM_SEGREDO;
  // Sem o segredo: libera só no desenvolvimento local. Em produção, falta de configuração bloqueia (falha fechada).
  if (!esperado) return process.env.NODE_ENV !== 'production';
  const recebido = request.headers.get(CABECALHO_ORIGEM) ?? '';
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Executa antes de cada página:
 * 1. Gera um nonce novo e monta a Content-Security-Policy (sem 'unsafe-inline' para scripts).
 * 0. Em produção, recusa quem não veio pela Cloudflare (cabeçalho secreto).
 * 2. Faz o redirecionamento otimista de quem não tem cookie de sessão.
 *    A verificação real da sessão acontece no servidor (src/lib/auth/sessao.ts) em toda página e ação.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Em produção o site só responde a quem passa pela Cloudflare (proteção, limite por IP).
  // Acesso direto ao endereço da AWS recebe 403. A verificação de saúde da AWS fica de fora.
  if (pathname !== '/api/saude' && !veioDaCloudflare(request)) {
    return new NextResponse('Acesso direto não permitido.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  const precisaGestor =
    pathname.startsWith('/gestao') &&
    !pathname.startsWith('/gestao/entrar') &&
    !pathname.startsWith('/gestao/definir-senha');
  const precisaServidor = pathname.startsWith('/portal');
  if (precisaGestor && !request.cookies.has(COOKIE_GESTOR)) {
    return NextResponse.redirect(new URL('/gestao/entrar', request.url));
  }
  if (precisaServidor && !request.cookies.has(COOKIE_SERVIDOR)) {
    return NextResponse.redirect(new URL('/entrar', request.url));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const dev = process.env.NODE_ENV === 'development';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    // Folhas e <style> só do próprio site (com nonce). Atributos style="" são liberados:
    // não executam código e são usados por componentes do Next (ex.: next/image).
    // Em desenvolvimento o overlay de erros do Next injeta <style> sem nonce.
    `style-src 'self'${dev ? " 'unsafe-inline'" : ` 'nonce-${nonce}'`}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'self'",
    ...(dev ? [] : ['upgrade-insecure-requests'])
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  // Páginas com dados pessoais nunca vão para cache compartilhado.
  if (precisaGestor || precisaServidor) response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|marca/|certificado/).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' }
      ]
    }
  ]
};
