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
        <label htmlFor="usuario">Usuário</label>
        <input
          id="usuario"
          name="usuario"
          type="text"
          className="entrada"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={40}
          placeholder="nome.sobrenome"
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
      <p className="pequeno texto-3">
        Esqueceu o usuário ou a senha? Peça ao administrador do sistema um novo link de acesso.
      </p>
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
