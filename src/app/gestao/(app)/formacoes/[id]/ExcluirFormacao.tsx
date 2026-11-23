'use client';

import { Trash2 } from 'lucide-react';
import { apagarFormacao } from '@/lib/acoes/gestao';
import { BotaoEnviar, FormAcao } from '@/components/FormAcao';

/** Só aparece para o administrador. O servidor recusa se a formação já emitiu certificado. */
export function ExcluirFormacao({ formacaoId, titulo }: { formacaoId: string; titulo: string }) {
  return (
    <section className="cartao cartao-corpo zona-perigo" aria-labelledby="t-excluir">
      <div className="pilha g6">
        <h2 id="t-excluir" className="titulo-secao">
          Excluir formação
        </h2>
        <p className="pequeno texto-3">
          Só é possível enquanto nenhum certificado foi emitido. Encontros, vínculos e presenças são apagados juntos.
        </p>
      </div>
      <FormAcao
        acao={apagarFormacao}
        confirmar={`Excluir “${titulo}”? Esta ação não pode ser desfeita.`}
        rotuloConfirmar="Excluir"
        perigo
      >
        <input type="hidden" name="formacaoId" value={formacaoId} />
        <BotaoEnviar className="botao botao-perigo" rotuloCarregando="Excluindo…">
          <Trash2 size={16} aria-hidden="true" /> Excluir formação
        </BotaoEnviar>
      </FormAcao>
    </section>
  );
}
