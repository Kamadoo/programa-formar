import Link from 'next/link';
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
            <img src="/marca/logo-orgao.png" alt="" className="logo" width={81} height={34} />
            <span>
              <strong>Programa Formar</strong>
              <span>Secretaria Municipal de Educação</span>
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
