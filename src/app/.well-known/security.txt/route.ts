import { INSTITUCIONAL } from '@/lib/institucional';

/** RFC 9116: onde avisar sobre falhas de segurança. A validade é renovada a cada publicação/requisição. */
export function GET() {
  const expira = new Date(Date.now() + 365 * 24 * 3600_000).toISOString();
  const site = process.env.SITE_URL ?? 'https://programaformar.example';
  const corpo = [
    `Contact: mailto:${INSTITUCIONAL.emailAtendimento}`,
    `Expires: ${expira}`,
    'Preferred-Languages: pt, en',
    `Canonical: ${site}/.well-known/security.txt`,
    `Policy: ${site}/termos#seguranca`,
    ''
  ].join('\n');
  return new Response(corpo, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }
  });
}
