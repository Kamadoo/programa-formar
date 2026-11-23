'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Tema = 'sistema' | 'claro' | 'escuro';
const ORDEM: Tema[] = ['sistema', 'claro', 'escuro'];
const ROTULO: Record<Tema, string> = { sistema: 'Tema automático', claro: 'Tema claro', escuro: 'Tema escuro' };

/** Alterna sistema → claro → escuro. A preferência fica num cookie não sensível. */
export function TemaAlternar() {
  const [tema, setTema] = useState<Tema>('sistema');

  useEffect(() => {
    const t = document.documentElement.dataset.tema;
    // Sincroniza o estado com o atributo definido pelo servidor (só no carregamento).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (t === 'claro' || t === 'escuro') setTema(t);
  }, []);

  function alternar() {
    const proximo = ORDEM[(ORDEM.indexOf(tema) + 1) % ORDEM.length];
    setTema(proximo);
    if (proximo === 'sistema') {
      delete document.documentElement.dataset.tema;
      document.cookie = 'tema=; path=/; max-age=0; samesite=lax';
    } else {
      document.documentElement.dataset.tema = proximo;
      document.cookie = `tema=${proximo}; path=/; max-age=31536000; samesite=lax`;
    }
  }

  const Icone = tema === 'claro' ? Sun : tema === 'escuro' ? Moon : Monitor;
  const proximo = ORDEM[(ORDEM.indexOf(tema) + 1) % ORDEM.length];
  return (
    <button
      type="button"
      className="botao botao-fantasma botao-icone"
      onClick={alternar}
      aria-label={`${ROTULO[tema]}. Mudar para ${ROTULO[proximo].toLowerCase()}`}
      title={ROTULO[tema]}
    >
      <Icone size={18} aria-hidden="true" />
    </button>
  );
}
