import type { NextConfig } from 'next';

/**
 * Cabeçalhos de segurança fixos. A Content-Security-Policy (com nonce por requisição)
 * é montada em src/proxy.ts, porque precisa mudar a cada página servida.
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : [])
];

const nextConfig: NextConfig = {
  // Gera um servidor Node enxuto (.next/standalone) para a imagem Docker da AWS.
  output: 'standalone',
  // Identifica cada publicação (o script de publicação passa NEXT_DEPLOYMENT_ID). Quem estava com uma tela
  // aberta da versão anterior tem a página recarregada, em vez de ver erro ao salvar ("Failed to find Server Action").
  deploymentId: process.env.NEXT_DEPLOYMENT_ID || undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  // Pacotes nativos/WASM que não devem passar pelo bundler.
  serverExternalPackages: ['@electric-sql/pglite', '@node-rs/argon2', 'pg', 'pdf-lib', '@pdf-lib/fontkit'],
  experimental: {
    serverActions: { bodySizeLimit: '4mb' }
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  }
};

export default nextConfig;
