'use client';

import { useActionState, useState } from 'react';
import { ArrowRight, Download, KeyRound, ShieldCheck } from 'lucide-react';
import type { Resultado } from '@/lib/acao';
import type { ResultadoAtivacao } from '@/lib/acoes/verificacao';
import { BotaoEnviar } from '@/components/FormAcao';
import css from '@/app/gestao/verificacao/verificacao.module.css';

type AcaoForm<T> = (estado: T, form: FormData) => Promise<T>;
type AcaoSimples = () => Promise<void>;

function CampoCodigo({ erro, recuperacao = false }: { erro: string | null; recuperacao?: boolean }) {
  return (
    <div className="campo">
      <label htmlFor="codigo">{recuperacao ? 'Código de recuperação' : 'Código do aplicativo'}</label>
      <input
        id="codigo"
        name="codigo"
        className={`entrada num ${css.codigo}`}
        inputMode={recuperacao ? 'text' : 'numeric'}
        autoComplete="one-time-code"
        maxLength={recuperacao ? 12 : 7}
        placeholder={recuperacao ? 'xxxx-xxxx' : '000000'}
        pattern={recuperacao ? undefined : '[0-9 ]*'}
        required
        autoFocus
        aria-invalid={Boolean(erro)}
        aria-describedby={erro ? 'erro-codigo' : undefined}
      />
      {erro ? (
        <span id="erro-codigo" className="erro-campo" role="alert">
          {erro}
        </span>
      ) : null}
    </div>
  );
}

/** Segunda etapa do login (gestão e portal recebem as próprias ações). */
export function VerificarCodigo({ verificar, cancelar }: { verificar: AcaoForm<Resultado>; cancelar: AcaoSimples }) {
  const [r, enviar] = useActionState(verificar, null);
  const [recuperacao, setRecuperacao] = useState(false);
  return (
    <div className="pilha g18">
      <form action={enviar} className="pilha g18" noValidate key={String(recuperacao)}>
        <CampoCodigo erro={r && !r.ok ? r.mensagem : null} recuperacao={recuperacao} />
        <BotaoEnviar className="botao botao-primario botao-largo botao-alto" rotuloCarregando="Conferindo…">
          Confirmar <ArrowRight size={18} aria-hidden="true" />
        </BotaoEnviar>
      </form>
      <div className="linha entre pequeno">
        <button type="button" className="botao-link" onClick={() => setRecuperacao(v => !v)}>
          {recuperacao ? 'Usar o código do aplicativo' : 'Perdi o celular: usar código de recuperação'}
        </button>
        <form action={cancelar}>
          <button type="submit" className="botao-link">
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
}

/** Cadastro do aplicativo autenticador + códigos de recuperação. */
export function AtivarVerificacao({
  qrDataUri,
  segredo,
  ativar,
  concluir,
  cancelar,
  rotuloConcluir = 'Já guardei, continuar',
  avisoRecarregado = 'Verificação ativada. Se não guardou os códigos de recuperação, gere novos em Minha conta.'
}: {
  qrDataUri: string;
  segredo: string;
  ativar: AcaoForm<ResultadoAtivacao>;
  concluir: AcaoSimples;
  cancelar: AcaoSimples;
  rotuloConcluir?: string;
  avisoRecarregado?: string;
}) {
  const [r, enviar] = useActionState(ativar, null);

  if (r?.ok && r.codigos) {
    const texto = `Programa Formar — códigos de recuperação\nCada código vale uma única vez.\n\n${r.codigos.join('\n')}\n`;
    return (
      <div className="pilha g18">
        <p className="aviso aviso-ok" role="status">
          <ShieldCheck size={18} aria-hidden="true" /> Verificação em duas etapas ativada.
        </p>
        <div className="pilha g10">
          <h2 className="titulo-secao">Guarde seus códigos de recuperação</h2>
          <p className="pequeno texto-3">
            Se perder o celular, cada código abaixo libera um acesso. Eles aparecem só agora: baixe ou anote em local
            seguro.
          </p>
          <ol className={css.recuperacao}>
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
        <form action={concluir}>
          <BotaoEnviar className="botao botao-primario botao-largo botao-alto" rotuloCarregando="Entrando…">
            {rotuloConcluir} <ArrowRight size={18} aria-hidden="true" />
          </BotaoEnviar>
        </form>
      </div>
    );
  }

  if (!qrDataUri) {
    // Página recarregada depois da ativação: os códigos não são mostrados de novo.
    return (
      <div className="pilha g18">
        <p className="aviso aviso-ok" role="status">
          <ShieldCheck size={18} aria-hidden="true" /> {avisoRecarregado}
        </p>
        <form action={concluir}>
          <BotaoEnviar className="botao botao-primario botao-largo botao-alto" rotuloCarregando="Entrando…">
            Continuar <ArrowRight size={18} aria-hidden="true" />
          </BotaoEnviar>
        </form>
      </div>
    );
  }

  return (
    <div className="pilha g18">
      <ol className={css.passos}>
        <li>
          Instale um aplicativo autenticador no celular (Google Authenticator, Microsoft Authenticator, Authy ou o
          gerenciador de senhas que já usa).
        </li>
        <li>No aplicativo, escolha adicionar conta e leia o QR code.</li>
      </ol>
      <div className={css.qr}>
        <img src={qrDataUri} alt="QR code para configurar o aplicativo autenticador" width={180} height={180} />
        <div className="pilha g6">
          <p className="pequeno texto-3">Não consegue ler? Digite a chave:</p>
          <p className={`mono ${css.chave}`}>{segredo}</p>
        </div>
      </div>
      <form action={enviar} className="pilha g18" noValidate>
        <p className="pequeno texto-2">
          <KeyRound size={15} aria-hidden="true" className={css.iconeInline} /> Digite o código de 6 dígitos que o
          aplicativo mostra agora.
        </p>
        <CampoCodigo erro={r && !r.ok ? r.mensagem : null} />
        <BotaoEnviar className="botao botao-primario botao-largo botao-alto" rotuloCarregando="Ativando…">
          Ativar e continuar
        </BotaoEnviar>
      </form>
      <form action={cancelar}>
        <button type="submit" className="botao-link pequeno">
          Cancelar e sair
        </button>
      </form>
    </div>
  );
}
