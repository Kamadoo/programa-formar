'use client';

import { useActionState } from 'react';
import { ArrowRight } from 'lucide-react';
import { entrarGestao } from '@/lib/acoes/auth';
import { BotaoEnviar } from '@/components/FormAcao';
import { CampoLembrar } from '@/app/(acesso)/CampoLembrar';

export function FormEntrarGestao() {
  const [r, enviar] = useActionState(entrarGestao, null);
  const erro = r && !r.ok ? r.mensagem : null;
  return (
    <form action={enviar} className="pilha g18" noValidate>
      <div className="campo">
        <label htmlFor="email">E-mail institucional</label>
        <input
          id="email"
          name="email"
          type="email"
          className="entrada"
          autoComplete="username"
          required
          aria-invalid={Boolean(erro)}
        />
      </div>
      <div className="campo">
        <label htmlFor="senha">Senha</label>
        <input
          id="senha"
          name="senha"
          type="password"
          className="entrada"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? 'erro-login' : undefined}
        />
      </div>
      <CampoLembrar />
      {erro ? (
        <p id="erro-login" className="aviso aviso-erro" role="alert">
          {erro}
        </p>
      ) : null}
      <BotaoEnviar className="botao botao-primario botao-largo botao-alto" rotuloCarregando="Entrando…">
        Entrar <ArrowRight size={18} aria-hidden="true" />
      </BotaoEnviar>
    </form>
  );
}
