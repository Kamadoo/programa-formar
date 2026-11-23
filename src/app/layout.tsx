import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import '@fontsource-variable/inter';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Programa Formar · Certificados', template: '%s · Programa Formar' },
  description: 'Formações e certificados dos servidores da Secretaria Municipal de Educação de Serra Clara.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f8f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0c1418' }
  ]
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const tema = (await cookies()).get('tema')?.value;
  const dataTema = tema === 'claro' || tema === 'escuro' ? tema : undefined;
  return (
    <html lang="pt-BR" data-tema={dataTema}>
      <body>
        <a href="#conteudo" className="pular">
          Pular para o conteúdo
        </a>
        <p className="faixa-demo" role="note">
          Versão de demonstração · todos os dados são fictícios
        </p>
        {children}
      </body>
    </html>
  );
}
