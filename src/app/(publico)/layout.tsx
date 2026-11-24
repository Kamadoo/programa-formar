import Link from 'next/link';
import { MarcaFormar } from '@/components/MarcaFormar';
import { Rodape } from '@/components/Rodape';
import { TemaAlternar } from '@/components/TemaAlternar';

/** Páginas públicas (validação, privacidade, acessibilidade). */
export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="topo-publico">
        <div className="faixa-marca" />
        <div className="container container-estreito linha entre">
          <Link href="/" className="marca-publica">
            <span>
              <MarcaFormar altura={22} />
              <span>Secretaria Municipal de Educação · Serra Clara</span>
            </span>
          </Link>
          <TemaAlternar />
        </div>
      </header>
      <main id="conteudo" className="container container-estreito pagina entra">
        {children}
      </main>
      <Rodape />
    </>
  );
}
