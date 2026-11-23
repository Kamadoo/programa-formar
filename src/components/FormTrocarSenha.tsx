'use client';

import { KeyRound } from 'lucide-react';
import type { Resultado } from '@/lib/acao';
import { BotaoEnviar, FormAcao } from './FormAcao';

/** Troca de senha (gestão ou portal): senha atual + nova + confirmação. */
export function FormTrocarSenha({
  acao,
  usuario
}: {
  acao: (a: Resultado, f: FormData) => Promise<Resultado>;
  usuario: string;
}) {
  return (
    <FormAcao acao={acao} limparAoSalvar className="pilha g14">
      {r => (
        <>
          <input type="text" name="usuario" value={usuario} autoComplete="username" readOnly hidden />
          <div className="campo">
            <label htmlFor="ts-atual">Senha atual</label>
            <input
              id="ts-atual"
              name="atual"
              type="password"
              className="entrada"
              autoComplete="current-password"
              required
              aria-invalid={Boolean(r?.erros?.atual)}
            />
            {r?.erros?.atual ? <span className="erro-campo">{r.erros.atual}</span> : null}
          </div>
          <div className="campo">
            <label htmlFor="ts-nova">Nova senha</label>
            <input
              id="ts-nova"
              name="nova"
              type="password"
              className="entrada"
              autoComplete="new-password"
              required
              maxLength={128}
              aria-invalid={Boolean(r?.erros?.nova)}
              aria-describedby="ts-regra"
            />
            <span id="ts-regra" className={r?.erros?.nova ? 'erro-campo' : 'dica'}>
              {r?.erros?.nova ?? 'Pelo menos 10 caracteres, com letras e números.'}
            </span>
          </div>
          <div className="campo">
            <label htmlFor="ts-conf">Repita a nova senha</label>
            <input
              id="ts-conf"
              name="confirmacao"
              type="password"
              className="entrada"
              autoComplete="new-password"
              required
              aria-invalid={Boolean(r?.erros?.confirmacao)}
            />
            {r?.erros?.confirmacao ? <span className="erro-campo">{r.erros.confirmacao}</span> : null}
          </div>
          <BotaoEnviar rotuloCarregando="Salvando…">
            <KeyRound size={16} aria-hidden="true" /> Trocar senha
          </BotaoEnviar>
        </>
      )}
    </FormAcao>
  );
}
