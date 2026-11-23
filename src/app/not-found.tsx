import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchX } from 'lucide-react';

export const metadata: Metadata = { title: 'Página não encontrada' };

export default function NaoEncontrado() {
  return (
    <>
      <div className="faixa-marca" />
      <main id="conteudo" className="container container-estreito pagina tela-aviso">
        <SearchX size={40} aria-hidden="true" className="icone-destaque" />
        <h1 className="titulo-pagina">Página não encontrada</h1>
        <p className="texto-3">O endereço pode estar errado, ou o conteúdo não existe mais ou não é seu.</p>
        <div className="linha">
          <Link href="/" className="botao botao-primario">
            Ir para o início
          </Link>
          <Link href="/validar" className="botao">
            Validar certificado
          </Link>
        </div>
      </main>
    </>
  );
}
