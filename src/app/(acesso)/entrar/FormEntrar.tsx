'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { ArrowRight } from 'lucide-react';
import { entrarPortal } from '@/lib/acoes/portal-acesso';
import { BotaoEnviar } from '@/components/FormAcao';
import css from '../acesso.module.css';
import { CampoLembrar } from '../CampoLembrar';
import { CampoSenha } from '../Campos';

export function FormEntrar() {
  const [r, enviar] = useActionState(entrarPortal, null);
  const erro = r && !r.ok ? r.mensagem : null;

  return (
    <form action={enviar} className="pilha g18" noValidate>
      <div className="campo">
        <div className="linha entre">
          <label htmlFor="usuario">Usuário</label>
          <Link href="/esqueci-usuario" className={css.linkPequeno}>
            Esqueci o usuário
          </Link>
        </div>
        <input
          id="usuario"
          name="usuario"
          className="entrada"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={40}
          placeholder="ex.: maria.silva"
          required
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? 'erro-login' : undefined}
        />
      </div>
      <CampoSenha
        erro={null}
        extra={
          <Link href="/esqueci-senha" className={css.linkPequeno}>
            Esqueci a senha
          </Link>
        }
      />
      <CampoLembrar />
      {erro ? (
        <p id="erro-login" className="aviso aviso-erro" role="alert">
          {erro}
        </p>
      ) : null}
      <BotaoEnviar className="botao botao-primario botao-largo botao-alto" rotuloCarregando="Entrando…">
        Entrar <ArrowRight size={18} aria-hidden="true" />
      </BotaoEnviar>
      <p className={css.alternativa}>
        Primeira vez aqui? <Link href="/primeiro-acesso">Ative seu acesso</Link>
      </p>
    </form>
  );
}
