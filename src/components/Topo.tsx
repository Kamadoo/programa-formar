import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { iniciais } from '@/lib/dominio/regras';
import { MarcaFormar } from './MarcaFormar';
import { TemaAlternar } from './TemaAlternar';
import { NavAbas, type Aba } from './NavAbas';
import css from './topo.module.css';

/** Cabeçalho comum da gestão e do portal. */
export function Topo({
  inicio,
  area,
  abas,
  nome,
  detalhe,
  sair,
  conta
}: {
  conta: string;
  inicio: string;
  area: string;
  abas: Aba[];
  nome: string;
  detalhe?: ReactNode;
  sair: () => Promise<void>;
}) {
  return (
    <header className={`topo ${css.topo}`}>
      <div className="faixa-marca" />
      <div className={`container ${css.barra}`}>
        <Link href={inicio} className={css.marca}>
          <span className={css.nomes}>
            <MarcaFormar altura={22} className={css.logoFormar} />
            <span>{area}</span>
          </span>
          <span className={css.divisor} aria-hidden="true" />
          <img
            src="/marca/logo-orgao.png"
            alt="Prefeitura de Serra Clara"
            className={`logo ${css.logoPrefeitura}`}
            width={74}
            height={31}
          />
        </Link>
        <div className={css.usuario}>
          <TemaAlternar />
          <Link href={conta} className={css.pessoa} title="Minha conta">
            <span className={css.quem}>
              <strong>{nome}</strong>
              {detalhe ? <span>{detalhe}</span> : null}
            </span>
            <span className={css.avatar} aria-hidden="true">
              {iniciais(nome)}
            </span>
            <span className="sr-only">Minha conta</span>
          </Link>
          <form action={sair}>
            <button type="submit" className="botao botao-fantasma botao-pequeno" aria-label="Sair da conta">
              <LogOut size={16} aria-hidden="true" />
              <span className={css.textoSair}>Sair</span>
            </button>
          </form>
        </div>
      </div>
      <div className={`container ${css.navLinha}`}>
        <NavAbas abas={abas} />
      </div>
    </header>
  );
}
