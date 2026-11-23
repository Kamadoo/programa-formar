'use client';

import { useActionState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { novosCodigosRecuperacao, type ResultadoAtivacao } from '@/lib/acoes/verificacao';
import { BotaoEnviar } from '@/components/FormAcao';

type Acao = (estado: ResultadoAtivacao, form: FormData) => Promise<ResultadoAtivacao>;

/** Usado na gestão e no portal (o portal passa a própria ação). */
export function NovosCodigos({ acao = novosCodigosRecuperacao }: { acao?: Acao }) {
  const [r, enviar] = useActionState(acao, null);
  if (r?.ok && r.codigos) {
    const texto = `Programa Formar — códigos de recuperação\nCada código vale uma única vez.\n\n${r.codigos.join('\n')}\n`;
    return (
      <div className="pilha g10">
        <p className="aviso aviso-ok" role="status">
          {r.mensagem}
        </p>
        <ol className="codigos-recuperacao">
          {r.codigos.map(c => (
            <li key={c} className="mono">
              {c}
            </li>
          ))}
        </ol>
        <a
          className="botao"
          download="programa-formar-codigos-recuperacao.txt"
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(texto)}`}
        >
          <Download size={16} aria-hidden="true" /> Baixar códigos (.txt)
        </a>
      </div>
    );
  }
  return (
    <form action={enviar} className="pilha g10" noValidate>
      <div className="campo">
        <label htmlFor="nc-codigo">Código atual do aplicativo</label>
        <input
          id="nc-codigo"
          name="codigo"
          className="entrada num"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          required
          aria-invalid={Boolean(r && !r.ok)}
          aria-describedby={r && !r.ok ? 'nc-erro' : undefined}
        />
        {r && !r.ok ? (
          <span id="nc-erro" className="erro-campo" role="alert">
            {r.mensagem}
          </span>
        ) : null}
      </div>
      <BotaoEnviar className="botao" rotuloCarregando="Gerando…">
        <RefreshCw size={16} aria-hidden="true" /> Gerar novos códigos
      </BotaoEnviar>
    </form>
  );
}
