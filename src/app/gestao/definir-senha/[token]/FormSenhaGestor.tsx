'use client';

import { useActionState } from 'react';
import { definirSenhaGestor } from '@/lib/acoes/conta';
import { BotaoEnviar } from '@/components/FormAcao';

export function FormSenhaGestor({ token, email }: { token: string; email: string }) {
  const [r, enviar] = useActionState(definirSenhaGestor, null);
  const e = r?.erros ?? {};
  return (
    <form action={enviar} className="pilha g18" noValidate>
      <input type="hidden" name="token" value={token} />
      <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
      <div className="campo">
        <label htmlFor="senha">Nova senha</label>
        <input
          id="senha"
          name="senha"
          type="password"
          className="entrada"
          autoComplete="new-password"
          required
          maxLength={128}
          aria-invalid={Boolean(e.senha)}
          aria-describedby="regra"
        />
        <span id="regra" className={e.senha ? 'erro-campo' : 'dica'}>
          {e.senha ?? 'Pelo menos 10 caracteres, com letras e números. Prefira uma frase longa.'}
        </span>
      </div>
      <div className="campo">
        <label htmlFor="confirmacao">Repita a nova senha</label>
        <input
          id="confirmacao"
          name="confirmacao"
          type="password"
          className="entrada"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(e.confirmacao)}
        />
        {e.confirmacao ? <span className="erro-campo">{e.confirmacao}</span> : null}
      </div>
      {r && !r.ok && !r.erros ? (
        <p className="aviso aviso-erro" role="alert">
          {r.mensagem}
        </p>
      ) : null}
      <BotaoEnviar className="botao botao-primario botao-largo botao-alto" rotuloCarregando="Salvando…">
        Salvar senha
      </BotaoEnviar>
    </form>
  );
}
