'use client';

import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Aviso flutuante anunciado por leitores de tela. Some sozinho depois de alguns segundos. */
export function Toast({ mensagem, ok = true, chave }: { mensagem: string | null; ok?: boolean; chave?: number }) {
  const [fechado, setFechado] = useState<number | undefined>(undefined);
  const visivel = Boolean(mensagem) && fechado !== chave;

  useEffect(() => {
    if (!mensagem) return;
    const id = setTimeout(() => setFechado(chave), ok ? 6000 : 10000);
    return () => clearTimeout(id);
  }, [mensagem, chave, ok]);

  return (
    <div role={ok ? 'status' : 'alert'} aria-live={ok ? 'polite' : 'assertive'}>
      {visivel && (
        <div className={`toast${ok ? '' : ' toast-erro'}`}>
          {ok ? (
            <CircleCheck className="icone-ok" size={20} aria-hidden="true" />
          ) : (
            <CircleAlert className="icone-ok" size={20} aria-hidden="true" />
          )}
          <span>{mensagem}</span>
          <button type="button" onClick={() => setFechado(chave)} aria-label="Fechar aviso">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
