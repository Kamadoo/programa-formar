'use client';

import { useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/** Campo de senha com botão mostrar/ocultar. */
export function CampoSenha({
  id = 'senha',
  name = 'senha',
  rotulo = 'Senha',
  autoComplete = 'current-password',
  erro,
  dica,
  extra
}: {
  id?: string;
  name?: string;
  rotulo?: ReactNode;
  autoComplete?: string;
  erro?: string | null;
  dica?: string;
  /** Conteúdo ao lado do rótulo (ex.: link "Esqueci a senha"). */
  extra?: ReactNode;
}) {
  const [ver, setVer] = useState(false);
  const idDica = dica || erro ? `${id}-dica` : undefined;
  return (
    <div className="campo">
      <div className="linha entre">
        <label htmlFor={id}>{rotulo}</label>
        {extra}
      </div>
      <div className="campo-senha">
        <input
          id={id}
          name={name}
          type={ver ? 'text' : 'password'}
          className="entrada"
          autoComplete={autoComplete}
          maxLength={128}
          required
          aria-invalid={Boolean(erro)}
          aria-describedby={idDica}
        />
        <button
          type="button"
          className="botao botao-fantasma botao-icone"
          onClick={() => setVer(v => !v)}
          aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={ver}
        >
          {ver ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {erro || dica ? (
        <span id={idDica} className={erro ? 'erro-campo' : 'dica'}>
          {erro ?? dica}
        </span>
      ) : null}
    </div>
  );
}

/** CPF: só números, com dica. */
/** CPF ou CNPJ (contas da gestão). Aceita o CNPJ alfanumérico (letras e números). */
export function CampoDocumento({ erro, defaultValue }: { erro?: string | null; defaultValue?: string }) {
  return (
    <div className="campo">
      <label htmlFor="documento">CPF ou CNPJ</label>
      <input
        id="documento"
        name="documento"
        className="entrada num"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={18}
        required
        defaultValue={defaultValue}
        aria-invalid={Boolean(erro)}
        aria-describedby="documento-dica"
        onInput={e => {
          const el = e.currentTarget;
          el.value = el.value.toUpperCase().replace(/[^\dA-Z./-]/g, '');
        }}
      />
      <span id="documento-dica" className={erro ? 'erro-campo' : 'dica'}>
        {erro ??
          'O mesmo que a administração cadastrou na sua conta. Pode digitar só os números (e as letras, no CNPJ novo).'}
      </span>
    </div>
  );
}

export function CampoCpf({ erro, defaultValue }: { erro?: string | null; defaultValue?: string }) {
  return (
    <div className="campo">
      <label htmlFor="cpf">CPF</label>
      <input
        id="cpf"
        name="cpf"
        className="entrada num"
        inputMode="numeric"
        autoComplete="off"
        maxLength={14}
        required
        defaultValue={defaultValue}
        aria-invalid={Boolean(erro)}
        aria-describedby="cpf-dica"
        onInput={e => {
          const el = e.currentTarget;
          el.value = el.value.replace(/[^\d.-]/g, '');
        }}
      />
      <span id="cpf-dica" className={erro ? 'erro-campo' : 'dica'}>
        {erro ?? 'Pode digitar só os números.'}
      </span>
    </div>
  );
}

/** Código de 6 números enviado por e-mail. */
export function CampoCodigoEmail({ erro }: { erro?: string | null }) {
  return (
    <div className="campo">
      <label htmlFor="codigo">Código recebido no e-mail</label>
      <input
        id="codigo"
        name="codigo"
        className="entrada num"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={7}
        placeholder="000000"
        required
        autoFocus
        aria-invalid={Boolean(erro)}
        aria-describedby="codigo-dica"
      />
      <span id="codigo-dica" className={erro ? 'erro-campo' : 'dica'}>
        {erro ?? 'São 6 números. O código vale por 10 minutos.'}
      </span>
    </div>
  );
}

/** Nova senha + confirmação. */
export function CamposNovaSenha({ erros }: { erros: Record<string, string> }) {
  return (
    <>
      <CampoSenha
        id="senha"
        name="senha"
        rotulo="Nova senha"
        autoComplete="new-password"
        erro={erros.senha}
        dica="Pelo menos 10 caracteres, com letras e números."
      />
      <CampoSenha
        id="confirmacao"
        name="confirmacao"
        rotulo="Repita a nova senha"
        autoComplete="new-password"
        erro={erros.confirmacao}
      />
    </>
  );
}
