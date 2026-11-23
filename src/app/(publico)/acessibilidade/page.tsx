import type { Metadata } from 'next';
import { INSTITUCIONAL as I } from '@/lib/institucional';

export const metadata: Metadata = { title: 'Acessibilidade' };

export default function Acessibilidade() {
  return (
    <article className="texto-longo">
      <p className="sobretitulo">Acessibilidade</p>
      <h1 className="titulo-pagina">Compromisso com a acessibilidade</h1>
      <p>O site do Programa Formar segue as diretrizes WCAG 2.2, nível AA, e o modelo eMAG do governo federal.</p>
      <ul>
        <li>
          Todas as funções podem ser usadas só pelo teclado; o atalho “Pular para o conteúdo” é o primeiro item da
          página.
        </li>
        <li>Textos e elementos têm contraste adequado nos temas claro e escuro.</li>
        <li>O tema acompanha a preferência do seu aparelho e pode ser trocado no botão do topo.</li>
        <li>Animações são desligadas quando o aparelho pede movimento reduzido.</li>
        <li>As telas funcionam em celulares a partir de 360 px de largura e com zoom de até 200%.</li>
        <li>Avisos e erros são anunciados por leitores de tela.</li>
      </ul>
      <p>
        Encontrou alguma barreira? Escreva para <a href={`mailto:${I.emailAtendimento}`}>{I.emailAtendimento}</a> para
        que possamos corrigir.
      </p>
    </article>
  );
}
