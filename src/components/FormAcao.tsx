'use client';

import { useActionState, useEffect, useRef, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import type { Resultado } from '@/lib/acao';
import { useAvisar } from './Avisos';
import { Toast } from './Toast';

type Props = {
  acao: (anterior: Resultado, dados: FormData) => Promise<Resultado>;
  children: ReactNode | ((r: Resultado) => ReactNode);
  className?: string;
  limparAoSalvar?: boolean;
  /** Pede confirmação numa caixa de diálogo acessível antes de enviar. */
  confirmar?: string;
  rotuloConfirmar?: string;
  perigo?: boolean;
  rotulo?: string;
};

/** Formulário ligado a uma Server Action, com estado de envio, confirmação e aviso de resultado. */
export function FormAcao({
  acao,
  children,
  className,
  limparAoSalvar,
  confirmar,
  rotuloConfirmar = 'Confirmar',
  perigo,
  rotulo
}: Props) {
  const avisar = useAvisar();
  // O aviso é disparado aqui (e não num efeito) porque a linha que originou a ação
  // pode sumir da tela na mesma renderização — ex.: validar um item da conferência.
  const [resultado, enviar] = useActionState(async (anterior: Resultado, dados: FormData) => {
    const r = await acao(anterior, dados);
    avisar?.(r);
    return r;
  }, null);
  const ref = useRef<HTMLFormElement>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const confirmado = useRef(false);

  useEffect(() => {
    if (resultado?.ok && limparAoSalvar) ref.current?.reset();
  }, [resultado, limparAoSalvar]);

  return (
    <form
      ref={ref}
      action={enviar}
      className={className}
      aria-label={rotulo}
      onSubmit={e => {
        if (confirmar && !confirmado.current) {
          e.preventDefault();
          dialogo.current?.showModal();
        }
        confirmado.current = false;
      }}
    >
      {typeof children === 'function' ? children(resultado) : children}
      {confirmar ? (
        <dialog ref={dialogo} className="dialogo" aria-label="Confirmação">
          <div className="pilha g18">
            <p className="titulo-secao">{confirmar}</p>
            <div className="linha entre">
              <button type="button" className="botao" onClick={() => dialogo.current?.close()} autoFocus>
                Cancelar
              </button>
              <button
                type="button"
                className={`botao ${perigo ? 'botao-perigo' : 'botao-primario'}`}
                onClick={() => {
                  confirmado.current = true;
                  dialogo.current?.close();
                  ref.current?.requestSubmit();
                }}
              >
                {rotuloConfirmar}
              </button>
            </div>
          </div>
        </dialog>
      ) : null}
      {avisar ? null : <Toast mensagem={resultado?.mensagem ?? null} ok={resultado?.ok ?? true} chave={resultado?.t} />}
    </form>
  );
}

/** Botão de envio que mostra "carregando" e evita clique duplo. */
export function BotaoEnviar({
  children,
  className = 'botao botao-primario',
  rotuloCarregando,
  ...resto
}: {
  children: ReactNode;
  className?: string;
  rotuloCarregando?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button {...resto} type="submit" className={className} disabled={pending || resto.disabled} aria-busy={pending}>
      {pending ? <Loader2 size={16} className="girando" aria-hidden="true" /> : null}
      {pending && rotuloCarregando ? rotuloCarregando : children}
    </button>
  );
}
