'use client';

import { useCallback, useEffect, useRef } from 'react';

const PREFIXO = 'pf:rascunho:';

/** Dá valor a um campo do jeito que o React percebe (dispara onChange nos campos controlados). */
function definirValor(el: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, valor);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Rascunho automático de formulário longo, guardado só nesta aba (sessionStorage).
 * Protege o que foi digitado quando a tela recarrega, dá erro ou o site é atualizado no meio do preenchimento.
 * `gatilho` (ex.: r?.t do useActionState) reaplica o rascunho depois de cada envio, porque o React
 * limpa o formulário ao final de uma ação.
 */
export function useRascunho(chave: string, gatilho?: unknown) {
  const ref = useRef<HTMLFormElement>(null);
  const k = PREFIXO + chave;

  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    try {
      const salvo = sessionStorage.getItem(k);
      if (salvo) {
        const dados = JSON.parse(salvo) as Record<string, string>;
        for (const [nome, valor] of Object.entries(dados)) {
          const el = form.elements.namedItem(nome);
          if (
            (el instanceof HTMLInputElement && el.type !== 'hidden' && !el.readOnly) ||
            el instanceof HTMLTextAreaElement
          ) {
            if (el.value !== valor) definirValor(el, valor);
          }
        }
      }
    } catch {
      // Rascunho ilegível: ignora.
    }
    const salvar = () => {
      const dados: Record<string, string> = {};
      new FormData(form).forEach((v, n) => {
        // Campos internos do Next.js ($ACTION_…) não entram no rascunho.
        if (typeof v === 'string' && !n.startsWith('$')) dados[n] = v;
      });
      try {
        sessionStorage.setItem(k, JSON.stringify(dados));
      } catch {
        // Armazenamento cheio ou bloqueado: segue sem rascunho.
      }
    };
    form.addEventListener('input', salvar);
    return () => form.removeEventListener('input', salvar);
  }, [k, gatilho]);

  const limpar = useCallback(() => {
    try {
      sessionStorage.removeItem(k);
    } catch {
      // nada a fazer
    }
  }, [k]);

  return { ref, limpar };
}

/** Apaga um rascunho pelo nome (ex.: depois que a formação nova foi criada). */
export function apagarRascunho(chave: string) {
  try {
    sessionStorage.removeItem(PREFIXO + chave);
  } catch {
    // nada a fazer
  }
}
