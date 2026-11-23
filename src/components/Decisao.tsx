'use client';

import { useRef } from 'react';
import { Check, X } from 'lucide-react';
import { decidir } from '@/lib/acoes/gestao';
import { BotaoEnviar, FormAcao } from './FormAcao';

/** Botões Validar / Recusar de uma participação em conferência. */
export function Decisao({
  participacaoId,
  nome,
  rotuloValidar = 'Validar'
}: {
  participacaoId: string;
  nome: string;
  rotuloValidar?: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  return (
    <div className="linha g6">
      <FormAcao acao={decidir} confirmar={`Validar e emitir o certificado de ${nome}?`}>
        <input type="hidden" name="participacaoId" value={participacaoId} />
        <input type="hidden" name="decisao" value="validar" />
        <BotaoEnviar className="botao botao-ok botao-pequeno" aria-label={`${rotuloValidar}: ${nome}`}>
          <Check size={15} aria-hidden="true" /> {rotuloValidar}
        </BotaoEnviar>
      </FormAcao>
      <button
        type="button"
        className="botao botao-perigo botao-pequeno"
        onClick={() => dialogo.current?.showModal()}
        aria-label={`Recusar: ${nome}`}
      >
        <X size={15} aria-hidden="true" /> Recusar
      </button>
      <dialog ref={dialogo} className="dialogo" aria-labelledby={`rec-${participacaoId}`}>
        <FormAcao acao={decidir} className="pilha g14">
          <h2 id={`rec-${participacaoId}`} className="titulo-secao">
            Recusar a emissão para {nome}?
          </h2>
          <p className="pequeno texto-3">
            O servidor verá no portal que o certificado não foi emitido e receberá um aviso por e-mail.
          </p>
          <input type="hidden" name="participacaoId" value={participacaoId} />
          <input type="hidden" name="decisao" value="recusar" />
          <div className="campo">
            <label htmlFor={`motivo-${participacaoId}`}>Observação para o servidor (opcional)</label>
            <textarea
              id={`motivo-${participacaoId}`}
              name="motivo"
              className="entrada texto-livre"
              maxLength={500}
              rows={3}
            />
          </div>
          <div className="linha entre">
            <button type="button" className="botao" onClick={() => dialogo.current?.close()}>
              Cancelar
            </button>
            <BotaoEnviar className="botao botao-perigo" onClick={() => setTimeout(() => dialogo.current?.close(), 50)}>
              Recusar emissão
            </BotaoEnviar>
          </div>
        </FormAcao>
      </dialog>
    </div>
  );
}
