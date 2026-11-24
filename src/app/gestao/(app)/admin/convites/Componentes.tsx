'use client';

import { useActionState, useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import { enviarConvitesPortal } from '@/lib/acoes/convites';
import type { Resultado } from '@/lib/acao';
import { MAX_CONVITES_POR_ENVIO, type SituacaoConvite } from '@/lib/dominio/convites-filtros';
import { BotaoEnviar } from '@/components/FormAcao';
import { useAvisar } from '@/components/Avisos';

export type LinhaConvite = {
  id: string;
  nome: string;
  email: string;
  matricula: string;
  detalhe: string;
  criadoEm: string;
  situacao: SituacaoConvite;
  rotuloSituacao: string;
  envios: number;
  ultimoEnvio: string | null;
  emailValido: boolean;
};

const CHIP: Record<SituacaoConvite, string> = {
  nunca: 'chip',
  na_fila: 'chip chip-info',
  enviado: 'chip chip-ok',
  falhou: 'chip chip-erro'
};

/** Tabela com caixas de marcação e o envio do convite de primeiro acesso para as contas marcadas. */
export function ListaConvites({ linhas, total }: { linhas: LinhaConvite[]; total: number }) {
  const avisar = useAvisar();
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const dialogo = useRef<HTMLDialogElement>(null);
  const [, enviar] = useActionState(async (anterior: Resultado, dados: FormData) => {
    const r = await enviarConvitesPortal(anterior, dados);
    avisar?.(r);
    if (r?.ok) setMarcados(new Set());
    dialogo.current?.close();
    return r;
  }, null);

  const marcaveis = linhas.filter(l => l.emailValido);
  // A seleção vale só para as linhas desta página (a lista é recarregada depois do envio).
  const escolhidos = linhas.filter(l => marcados.has(l.id));
  const todos = marcaveis.length > 0 && marcaveis.every(l => marcados.has(l.id));
  const algum = escolhidos.length > 0;
  const jaRecebeu = escolhidos.filter(l => l.situacao === 'enviado').length;
  const naFila = escolhidos.filter(l => l.situacao === 'na_fila').length;
  const acima = escolhidos.length > MAX_CONVITES_POR_ENVIO;

  const alternar = (id: string) =>
    setMarcados(m => {
      const n = new Set(m);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      <table className="tabela tabela-ajustada tabela-convites">
        <thead>
          <tr>
            <th scope="col">
              <input
                type="checkbox"
                className="caixa-marcar"
                aria-label="Marcar todas desta página"
                checked={todos}
                disabled={!marcaveis.length}
                onChange={() => setMarcados(todos ? new Set() : new Set(marcaveis.map(l => l.id)))}
              />
            </th>
            <th scope="col">Nome</th>
            <th scope="col">E-mail institucional</th>
            <th scope="col">Convite</th>
            <th scope="col">Na base desde</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(l => (
            <tr key={l.id} className={marcados.has(l.id) ? 'linha-marcada' : undefined}>
              <td className="celula-marcar">
                <input
                  type="checkbox"
                  className="caixa-marcar"
                  aria-label={`Marcar ${l.nome}`}
                  checked={marcados.has(l.id)}
                  disabled={!l.emailValido}
                  onChange={() => alternar(l.id)}
                />
              </td>
              <td data-rotulo="Nome">
                <div className="celula-nome">
                  <strong>{l.nome}</strong>
                  <span>{[`Mat. ${l.matricula}`, l.detalhe].filter(Boolean).join(' · ')}</span>
                </div>
              </td>
              <td data-rotulo="E-mail" className="pequeno quebra-livre">
                {l.email}
                {!l.emailValido ? <span className="chip chip-erro bloco">E-mail inválido</span> : null}
              </td>
              <td data-rotulo="Convite">
                <div className="celula-nome">
                  <span className={CHIP[l.situacao]}>{l.rotuloSituacao}</span>
                  {l.ultimoEnvio ? (
                    <span>
                      {l.envios > 1 ? `${l.envios} envios · ` : ''}último em {l.ultimoEnvio}
                    </span>
                  ) : null}
                </div>
              </td>
              <td data-rotulo="Na base desde" className="num pequeno">
                {l.criadoEm}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="barra-selecao" role="region" aria-label="Seleção">
        <p className="pequeno" aria-live="polite">
          <strong className="num">{escolhidos.length}</strong> marcada(s)
          {total > linhas.length ? (
            <span className="texto-3">
              {' '}
              · mostrando {linhas.length} de {total}
            </span>
          ) : null}
        </p>
        <div className="linha g6">
          {algum ? (
            <button type="button" className="botao botao-fantasma botao-pequeno" onClick={() => setMarcados(new Set())}>
              Desmarcar todas
            </button>
          ) : null}
          <button
            type="button"
            className="botao botao-primario botao-pequeno"
            disabled={!algum || acima}
            onClick={() => dialogo.current?.showModal()}
          >
            <Mail size={15} aria-hidden="true" /> Enviar convite
          </button>
        </div>
      </div>

      <dialog ref={dialogo} className="dialogo" aria-labelledby="t-enviar-convites">
        <form action={enviar} className="pilha g14">
          <h2 id="t-enviar-convites" className="titulo-secao">
            Enviar o convite para {escolhidos.length} pessoa(s)?
          </h2>
          <p className="pequeno texto-3">
            Cada pessoa recebe no e-mail institucional a apresentação do Programa Formar e o passo a passo do primeiro
            acesso. Quem ainda não tinha acesso ao portal passa a ter.
          </p>
          {naFila ? (
            <p className="pequeno">{naFila} convite(s) ainda estão na fila de envio e não serão repetidos.</p>
          ) : null}
          {jaRecebeu ? (
            <label className="linha g6 pequeno">
              <input type="checkbox" name="reenviar" value="1" className="caixa-marcar" />
              Reenviar para {jaRecebeu} pessoa(s) que já receberam
            </label>
          ) : null}
          {escolhidos.map(l => (
            <input key={l.id} type="hidden" name="ids" value={l.id} />
          ))}
          <div className="linha entre">
            <button type="button" className="botao" onClick={() => dialogo.current?.close()} autoFocus>
              Cancelar
            </button>
            <BotaoEnviar rotuloCarregando="Enviando…">
              <Mail size={15} aria-hidden="true" /> Enviar convites
            </BotaoEnviar>
          </div>
        </form>
      </dialog>
    </>
  );
}
