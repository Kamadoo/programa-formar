'use client';

import { useRef } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { alterarEncontro, excluirEncontro, novoEncontro } from '@/lib/acoes/gestao';
import { BotaoEnviar, FormAcao } from '@/components/FormAcao';
import { dataBR } from '@/lib/dominio/regras';

type Encontro = { id: string; ordem: number; data: string; modulo: string; realizado: boolean };

function EditarEncontro({ formacaoId, e, admin }: { formacaoId: string; e: Encontro; admin: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  if (e.realizado && !admin) return null;
  return (
    <>
      <button
        type="button"
        className="botao botao-fantasma botao-icone"
        onClick={() => ref.current?.showModal()}
        aria-label={`Editar encontro E${e.ordem}`}
      >
        <Pencil size={16} aria-hidden="true" />
      </button>
      <dialog ref={ref} className="dialogo" aria-labelledby={`ed-${e.id}`}>
        <FormAcao acao={alterarEncontro} className="pilha g14">
          {r => (
            <>
              <div className="linha entre">
                <h2 id={`ed-${e.id}`} className="titulo-secao">
                  Editar encontro E{e.ordem}
                </h2>
                <button
                  type="button"
                  className="botao botao-fantasma botao-icone"
                  onClick={() => ref.current?.close()}
                  aria-label="Fechar"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              {e.realizado ? (
                <p className="aviso aviso-alerta pequeno">
                  Encontro já realizado: a correção fica registrada na auditoria.
                </p>
              ) : null}
              <input type="hidden" name="formacaoId" value={formacaoId} />
              <input type="hidden" name="encontroId" value={e.id} />
              <div className="campo">
                <label htmlFor={`ed-data-${e.id}`}>Data</label>
                <input
                  id={`ed-data-${e.id}`}
                  name="data"
                  type="date"
                  className="entrada num"
                  defaultValue={e.data}
                  required
                />
              </div>
              <div className="campo">
                <label htmlFor={`ed-mod-${e.id}`}>Módulo</label>
                <input
                  id={`ed-mod-${e.id}`}
                  name="modulo"
                  className="entrada"
                  defaultValue={e.modulo}
                  maxLength={160}
                  required
                />
              </div>
              {r?.ok ? null : r ? <p className="erro-campo">{r.mensagem}</p> : null}
              <div className="linha entre">
                <button type="button" className="botao" onClick={() => ref.current?.close()}>
                  Fechar
                </button>
                <BotaoEnviar rotuloCarregando="Salvando…">Salvar</BotaoEnviar>
              </div>
            </>
          )}
        </FormAcao>
      </dialog>
    </>
  );
}

export function Encontros({
  formacaoId,
  encontros,
  admin = false
}: {
  formacaoId: string;
  encontros: Encontro[];
  admin?: boolean;
}) {
  const ultimo = encontros.at(-1);
  return (
    <section className="cartao" aria-labelledby="t-encontros">
      <div className="cartao-cabeca">
        <h2 id="t-encontros" className="titulo-secao">
          Encontros e módulos
        </h2>
        <span className="pequeno texto-3">{encontros.length} encontro(s)</span>
      </div>
      {encontros.length ? (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Data</th>
                <th scope="col">Módulo</th>
                <th scope="col">Situação</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {encontros.map(e => (
                <tr key={e.id}>
                  <td className="num texto-3">E{e.ordem}</td>
                  <td className="num">{dataBR(e.data)}</td>
                  <td>{e.modulo}</td>
                  <td>
                    {e.realizado ? (
                      <span className="chip chip-ok">Realizado</span>
                    ) : (
                      <span className="chip">Agendado</span>
                    )}
                  </td>
                  <td className="direita sem-quebra">
                    <EditarEncontro formacaoId={formacaoId} e={e} admin={admin} />
                    {!e.realizado && e.id === ultimo?.id ? (
                      <FormAcao
                        acao={excluirEncontro}
                        confirmar={`Remover o encontro E${e.ordem} (${dataBR(e.data)})?`}
                      >
                        <input type="hidden" name="formacaoId" value={formacaoId} />
                        <input type="hidden" name="encontroId" value={e.id} />
                        <BotaoEnviar
                          className="botao botao-fantasma botao-icone"
                          aria-label={`Remover encontro E${e.ordem}`}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </BotaoEnviar>
                      </FormAcao>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="cartao-corpo texto-3">Nenhum encontro ainda. Adicione o primeiro abaixo.</p>
      )}
      <div className="cartao-corpo borda-topo">
        <FormAcao acao={novoEncontro} limparAoSalvar rotulo="Adicionar encontro">
          {r => (
            <div className="form-encontro">
              <input type="hidden" name="formacaoId" value={formacaoId} />
              <div className="campo">
                <label htmlFor="enc-data">Data</label>
                <input
                  id="enc-data"
                  name="data"
                  type="date"
                  className="entrada num"
                  required
                  min={ultimo?.data}
                  aria-invalid={Boolean(r?.erros?.data)}
                />
              </div>
              <div className="campo">
                <label htmlFor="enc-modulo">Módulo</label>
                <input
                  id="enc-modulo"
                  name="modulo"
                  className="entrada"
                  required
                  maxLength={160}
                  aria-invalid={Boolean(r?.erros?.modulo)}
                  placeholder="Ex.: Geometria I"
                />
              </div>
              <BotaoEnviar className="botao" rotuloCarregando="Adicionando…">
                <Plus size={16} aria-hidden="true" /> Adicionar encontro
              </BotaoEnviar>
            </div>
          )}
        </FormAcao>
      </div>
    </section>
  );
}
