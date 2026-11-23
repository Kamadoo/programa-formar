'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Resultado } from '@/lib/acao';
import { Toast } from './Toast';

const Ctx = createContext<((r: Resultado) => void) | null>(null);

/**
 * Mantém o aviso (toast) fora dos formulários: assim ele continua visível mesmo
 * quando a linha que originou a ação some da tela (ex.: remover participante).
 */
export function Avisos({ children }: { children: ReactNode }) {
  const [atual, setAtual] = useState<Resultado>(null);
  const avisar = useCallback((r: Resultado) => {
    if (r) setAtual(r);
  }, []);
  return (
    <Ctx value={avisar}>
      {children}
      <Toast mensagem={atual?.mensagem ?? null} ok={atual?.ok ?? true} chave={atual?.t} />
    </Ctx>
  );
}

export function useAvisar() {
  return useContext(Ctx);
}
