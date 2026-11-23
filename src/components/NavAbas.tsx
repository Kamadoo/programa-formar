'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import css from './topo.module.css';

export type Aba = { href: string; rotulo: string; contador?: number; alerta?: boolean; exato?: boolean };

export function NavAbas({ abas, rotulo = 'Navegação principal' }: { abas: Aba[]; rotulo?: string }) {
  const caminho = usePathname();
  return (
    <nav aria-label={rotulo} className={css.nav}>
      <ul>
        {abas.map(a => {
          const ativa = a.exato ? caminho === a.href : caminho === a.href || caminho.startsWith(a.href + '/');
          return (
            <li key={a.href}>
              <Link href={a.href} className={css.aba} aria-current={ativa ? 'page' : undefined}>
                {a.rotulo}
                {a.contador ? (
                  <span className={a.alerta ? 'contador' : css.contadorNeutro}>
                    {a.contador}
                    {a.alerta ? <span className="sr-only"> pendentes</span> : null}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
