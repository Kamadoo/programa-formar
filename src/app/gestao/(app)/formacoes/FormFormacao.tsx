'use client';

import { useActionState, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { salvarFormacao } from '@/lib/acoes/gestao';
import { BotaoEnviar } from '@/components/FormAcao';
import { Toast } from '@/components/Toast';
import { apagarRascunho, useRascunho } from '@/components/useRascunho';

export type ValoresFormacao = {
  id?: string;
  titulo: string;
  tituloCurto: string;
  programaEixo: string;
  formador: string;
  local: string;
  cargaPresencialH: number;
  cargaEstudoH: number;
  conteudoProgramatico: string;
  prefixoCodigo: string;
};

function Campo({
  nome,
  rotulo,
  erro,
  dica,
  className = 'c6',
  children
}: {
  nome: string;
  rotulo: string;
  erro?: string;
  dica?: string;
  className?: string;
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => React.ReactNode;
}) {
  const id = `f-${nome}`;
  const desc = erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;
  return (
    <div className={`campo ${className}`}>
      <label htmlFor={id}>{rotulo}</label>
      {children({ id, 'aria-invalid': Boolean(erro), 'aria-describedby': desc })}
      {erro ? (
        <span id={`${id}-erro`} className="erro-campo">
          {erro}
        </span>
      ) : dica ? (
        <span id={`${id}-dica`} className="dica">
          {dica}
        </span>
      ) : null}
    </div>
  );
}

export function FormFormacao({
  valores,
  periodo,
  recemCriada
}: {
  valores?: ValoresFormacao;
  periodo?: string;
  recemCriada?: boolean;
}) {
  const [r, enviar] = useActionState(salvarFormacao, null);
  // O que foi digitado fica guardado nesta aba até salvar com sucesso.
  const { ref, limpar } = useRascunho(valores?.id ? `formacao:${valores.id}` : 'formacao:nova', r?.t);
  useEffect(() => {
    if (r?.ok) limpar();
  }, [r, limpar]);
  useEffect(() => {
    if (recemCriada) apagarRascunho('formacao:nova');
  }, [recemCriada]);
  const [pres, setPres] = useState(valores?.cargaPresencialH ?? 0);
  const [est, setEst] = useState(valores?.cargaEstudoH ?? 0);
  const e = r?.erros ?? {};
  const v = valores;

  return (
    <form ref={ref} action={enviar} className="pilha g18" noValidate>
      {v?.id ? <input type="hidden" name="id" value={v.id} /> : null}
      <div className="grade-form">
        <Campo nome="titulo" rotulo="Nome da formação (como sai no certificado)" erro={e.titulo}>
          {p => <input {...p} name="titulo" className="entrada" defaultValue={v?.titulo} maxLength={200} required />}
        </Campo>
        <Campo nome="programaEixo" rotulo="Programa / eixo" erro={e.programaEixo} className="c4">
          {p => (
            <input
              {...p}
              name="programaEixo"
              className="entrada"
              defaultValue={v?.programaEixo}
              maxLength={160}
              required
            />
          )}
        </Campo>
        <Campo nome="formador" rotulo="Formador(a)" erro={e.formador} className="c2">
          {p => (
            <input {...p} name="formador" className="entrada" defaultValue={v?.formador} maxLength={160} required />
          )}
        </Campo>
        <Campo nome="cargaPresencialH" rotulo="Presencial (h)" erro={e.cargaPresencialH} className="c2">
          {p => (
            <input
              {...p}
              name="cargaPresencialH"
              type="number"
              min={0}
              max={2000}
              inputMode="numeric"
              className="entrada num"
              value={pres}
              onChange={ev => setPres(Number(ev.target.value) || 0)}
            />
          )}
        </Campo>
        <Campo nome="cargaEstudoH" rotulo="Estudo (h)" erro={e.cargaEstudoH} className="c2">
          {p => (
            <input
              {...p}
              name="cargaEstudoH"
              type="number"
              min={0}
              max={2000}
              inputMode="numeric"
              className="entrada num"
              value={est}
              onChange={ev => setEst(Number(ev.target.value) || 0)}
            />
          )}
        </Campo>
        <Campo nome="total" rotulo="Total (h)" dica="Calculado" className="c2">
          {p => <input {...p} className="entrada num" value={pres + est} readOnly tabIndex={-1} />}
        </Campo>
        <Campo nome="local" rotulo="Local" erro={e.local} className="c3">
          {p => <input {...p} name="local" className="entrada" defaultValue={v?.local} maxLength={160} required />}
        </Campo>
        <Campo nome="periodo" rotulo="Período" dica="Calculado a partir dos encontros" className="c3">
          {p => (
            <input
              {...p}
              className="entrada"
              value={periodo ?? 'Defina os encontros depois de salvar'}
              readOnly
              tabIndex={-1}
            />
          )}
        </Campo>
        <Campo
          nome="tituloCurto"
          rotulo="Nome curto (arquivo PDF)"
          erro={e.tituloCurto}
          dica="Ex.: Matematica Supervisores"
          className="c3"
        >
          {p => (
            <input
              {...p}
              name="tituloCurto"
              className="entrada"
              defaultValue={v?.tituloCurto}
              maxLength={40}
              required
            />
          )}
        </Campo>
        <Campo
          nome="prefixoCodigo"
          rotulo="Prefixo do código"
          erro={e.prefixoCodigo}
          dica="Ex.: CNCAMAT → PNL-2026-CNCAMAT-0001"
          className="c3"
        >
          {p => (
            <input
              {...p}
              name="prefixoCodigo"
              className="entrada mono"
              defaultValue={v?.prefixoCodigo}
              maxLength={12}
              autoCapitalize="characters"
              required
            />
          )}
        </Campo>
        <Campo
          nome="conteudoProgramatico"
          rotulo="Conteúdo programático (verso do certificado)"
          erro={e.conteudoProgramatico}
          dica='Um módulo por linha; itens do módulo começam com "-".'
        >
          {p => (
            <textarea
              {...p}
              name="conteudoProgramatico"
              className="entrada"
              defaultValue={v?.conteudoProgramatico}
              maxLength={6000}
              rows={9}
            />
          )}
        </Campo>
      </div>
      <p className="dica">Frequência mínima para o certificado: 80% dos encontros.</p>
      <div className="linha">
        <BotaoEnviar rotuloCarregando="Salvando…">
          <Save size={17} aria-hidden="true" /> {v?.id ? 'Salvar formação' : 'Criar formação'}
        </BotaoEnviar>
      </div>
      <Toast mensagem={r?.mensagem ?? null} ok={r?.ok ?? true} chave={r?.t} />
    </form>
  );
}
