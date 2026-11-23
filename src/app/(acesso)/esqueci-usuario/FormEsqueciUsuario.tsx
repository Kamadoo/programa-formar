'use client';

import { useActionState } from 'react';
import { MailCheck, Send } from 'lucide-react';
import { lembrarUsuario } from '@/lib/acoes/portal-acesso';
import { BotaoEnviar } from '@/components/FormAcao';
import { CampoCpf } from '../Campos';

export function FormEsqueciUsuario() {
  const [r, enviar] = useActionState(lembrarUsuario, null);
  if (r?.ok) {
    return (
      <p className="aviso aviso-ok" role="status">
        <MailCheck size={18} aria-hidden="true" /> {r.mensagem}
      </p>
    );
  }
  return (
    <form action={enviar} className="pilha g18" noValidate>
      <CampoCpf erro={r?.erros?.cpf ?? null} />
      {r && !r.ok && !r.erros ? (
        <p className="aviso aviso-erro" role="alert">
          {r.mensagem}
        </p>
      ) : null}
      <BotaoEnviar className="botao botao-primario botao-largo botao-alto" rotuloCarregando="Enviando…">
        <Send size={17} aria-hidden="true" /> Enviar meu usuário
      </BotaoEnviar>
    </form>
  );
}
