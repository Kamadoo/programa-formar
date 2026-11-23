'use client';

import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';

/** Erro inesperado: mensagem simples, sem detalhes técnicos (eles ficam no log do servidor). */
export default function Erro({ reset, error }: { reset: () => void; error: Error & { digest?: string } }) {
  return (
    <main id="conteudo" className="container container-estreito pagina tela-aviso">
      <TriangleAlert size={40} aria-hidden="true" className="icone-alerta" />
      <h1 className="titulo-pagina">Algo deu errado</h1>
      <p className="texto-3">
        Não foi possível carregar esta tela. Se o site acabou de ser atualizado, recarregar resolve. Se você estava
        preenchendo um formulário longo (como o de formação), o que digitou continua guardado neste navegador.
      </p>
      {error.digest ? <p className="pequeno texto-3 mono">Código do erro: {error.digest}</p> : null}
      <div className="linha">
        <button type="button" className="botao botao-primario" onClick={() => window.location.reload()}>
          Recarregar a página
        </button>
        <button type="button" className="botao" onClick={() => reset()}>
          Tentar de novo
        </button>
        <Link href="/" className="botao">
          Ir para o início
        </Link>
      </div>
    </main>
  );
}
