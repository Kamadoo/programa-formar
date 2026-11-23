'use client';

import { useActionState } from 'react';
import type { Resultado } from '@/lib/acao';
import { BotaoEnviar } from '@/components/FormAcao';
import { CamposNovaSenha } from './Campos';

/** Cria a senha no último passo do primeiro acesso. */
export function FormNovaSenha({ acao }: { acao: (e: Resultado, f: FormData) => Promise<Resultado> }) {
  const [r, enviar] = useActionState(acao, null);
  return (
    <form action={enviar} className="pilha g18" noValidate>
      <CamposNovaSenha erros={r?.erros ?? {}} />
      {r && !r.ok && !r.erros ? (
        <p className="aviso aviso-erro" role="alert">
          {r.mensagem}
        </p>
      ) : null}
      <BotaoEnviar className="botao botao-primario botao-largo botao-alto" rotuloCarregando="Salvando…">
        Salvar senha e concluir
      </BotaoEnviar>
    </form>
  );
}
