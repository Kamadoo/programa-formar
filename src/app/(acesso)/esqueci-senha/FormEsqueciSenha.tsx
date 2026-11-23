'use client';

import { useActionState, useState } from 'react';
import { MailCheck, Send } from 'lucide-react';
import { pedirCodigoSenha, redefinirSenhaComCodigo } from '@/lib/acoes/portal-acesso';
import { BotaoEnviar } from '@/components/FormAcao';
import { CampoCodigoEmail, CamposNovaSenha } from '../Campos';

/** Usuário → código no e-mail → nova senha. O código do aplicativo continua sendo pedido no login. */
export function FormEsqueciSenha() {
  const [usuario, setUsuario] = useState('');
  const [pedido, pedir] = useActionState(pedirCodigoSenha, null);
  const [troca, trocar] = useActionState(redefinirSenhaComCodigo, null);
  const [corrigindo, setCorrigindo] = useState(false);

  if (!pedido?.ok || corrigindo) {
    const erro = pedido && !pedido.ok ? pedido.mensagem : null;
    return (
      <form
        action={f => {
          setUsuario(
            String(f.get('usuario') ?? '')
              .trim()
              .toLowerCase()
          );
          setCorrigindo(false);
          return pedir(f);
        }}
        className="pilha g18"
        noValidate
      >
        <div className="campo">
          <label htmlFor="usuario">Usuário</label>
          <input
            id="usuario"
            name="usuario"
            className="entrada"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={40}
            placeholder="ex.: maria.silva"
            defaultValue={usuario}
            required
            aria-invalid={Boolean(erro)}
            aria-describedby="usuario-dica"
          />
          <span id="usuario-dica" className={erro ? 'erro-campo' : 'dica'}>
            {erro ?? 'O código chega no seu e-mail institucional.'}
          </span>
        </div>
        <BotaoEnviar className="botao botao-primario botao-largo botao-alto" rotuloCarregando="Enviando…">
          <Send size={17} aria-hidden="true" /> Enviar código
        </BotaoEnviar>
      </form>
    );
  }

  const e = troca?.erros ?? {};
  return (
    <div className="pilha g18">
      <p className="aviso aviso-ok" role="status">
        <MailCheck size={18} aria-hidden="true" /> {pedido.mensagem}
      </p>
      <form action={trocar} className="pilha g18" noValidate>
        <input type="hidden" name="usuario" value={usuario} />
        <CampoCodigoEmail erro={e.codigo ?? null} />
        <CamposNovaSenha erros={e} />
        {troca && !troca.ok && !troca.erros ? (
          <p className="aviso aviso-erro" role="alert">
            {troca.mensagem}
          </p>
        ) : null}
        <BotaoEnviar className="botao botao-primario botao-largo botao-alto" rotuloCarregando="Salvando…">
          Salvar nova senha
        </BotaoEnviar>
      </form>
      <div className="linha entre pequeno">
        <form
          action={f => {
            f.set('usuario', usuario);
            return pedir(f);
          }}
        >
          <button type="submit" className="botao-link">
            Reenviar código
          </button>
        </form>
        <button type="button" className="botao-link" onClick={() => setCorrigindo(true)}>
          Corrigir o usuário
        </button>
      </div>
    </div>
  );
}
