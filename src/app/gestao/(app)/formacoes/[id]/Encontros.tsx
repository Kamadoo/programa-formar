'use client';

import { useRef } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { alterarEncontro, excluirEncontro, novoEncontro } from '@/lib/acoes/gestao';
import { BotaoEnviar, FormAcao } from '@/components/FormAcao';
import { cargasEncontros, dataBR, horasTexto } from '@/lib/dominio/regras';

type Encontro = {
  id: string;
  ordem: number;
  data: string;
  modulo: string;
  topico: string;
  cargaH: number | null;
  realizado: boolean;
};

/** Campos de módulo, tópico e carga (iguais no formulário de novo encontro e na edição). */
function CamposConteudo({ prefixo, e, erros }: { prefixo: string; e?: Encontro; erros?: Record<string, string> }) {
  return (
    <>
      <div className="campo">
        <label htmlFor={`${prefixo}-modulo`}>Módulo</label>
        <input
          id={`${prefixo}-modulo`}
          name="modulo"
          className="entrada"
          list="lista-modulos"
          defaultValue={e?.modulo}
          required
          maxLength={120}
          aria-invalid={Boolean(erros?.modulo)}
          placeholder="Ex.: Números"
        />
      </div>
      <div className="campo">
        <label htmlFor={`${prefixo}-topico`}>Tópico (opcional)</label>
        <input
          id={`${prefixo}-topico`}
          name="topico"
          className="entrada"
          defaultValue={e?.topico}
          maxLength={160}
          aria-invalid={Boolean(erros?.topico)}
          placeholder="Ex.: Sistema de numeração decimal"
        />
      </div>
      <div className="campo">
        <label htmlFor={`${prefixo}-carga`}>Carga (h)</label>
        <input
          id={`${prefixo}-carga`}
          name="cargaH"
          className="entrada num"
          inputMode="decimal"
          defaultValue={e?.cargaH == null ? '' : horasTexto(e.cargaH)}
          aria-invalid={Boolean(erros?.cargaH)}
          aria-describedby={`${prefixo}-carga-dica`}
          placeholder="Auto"
          size={5}
        />
        <span id={`${prefixo}-carga-dica`} className="sr-only">
          Em branco: a carga presencial é dividida igualmente entre os encontros.
        </span>
      </div>
    </>
  );
}

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
              <CamposConteudo prefixo={`ed-${e.id}`} e={e} />
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
  cargaPresencialH,
  admin = false
}: {
  formacaoId: string;
  encontros: Encontro[];
  cargaPresencialH: number;
  admin?: boolean;
}) {
  const ultimo = encontros.at(-1);
  const cargas = cargasEncontros(encontros, cargaPresencialH);
  const soma = cargas.reduce((t, c) => t + c, 0);
  const modulos = [...new Set(encontros.map(e => e.modulo))];
  return (
    <section className="cartao" aria-labelledby="t-encontros">
      <div className="cartao-cabeca">
        <h2 id="t-encontros" className="titulo-secao">
          Encontros e módulos
        </h2>
        <span className="pequeno texto-3">
          {encontros.length} encontro(s){encontros.length ? ` · ${horasTexto(soma)}h` : ''}
        </span>
      </div>
      <datalist id="lista-modulos">
        {modulos.map(m => (
          <option key={m} value={m} />
        ))}
      </datalist>
      {encontros.length && Math.abs(soma - cargaPresencialH) > 0.05 ? (
        <p className="cartao-corpo aviso aviso-alerta pequeno">
          A soma das cargas dos encontros ({horasTexto(soma)}h) é diferente da carga presencial da formação (
          {cargaPresencialH}h). Confira as cargas dos encontros ou a carga presencial.
        </p>
      ) : null}
      {encontros.length ? (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Data</th>
                <th scope="col">Módulo</th>
                <th scope="col">Tópico</th>
                <th scope="col" className="direita">
                  Carga
                </th>
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
                  <td>{e.topico || <span className="texto-3">—</span>}</td>
                  <td className="num direita" title={e.cargaH == null ? 'Dividida igualmente' : undefined}>
                    {horasTexto(cargas[encontros.indexOf(e)])}h
                    {e.cargaH == null ? <span className="texto-3">*</span> : null}
                  </td>
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
              <CamposConteudo prefixo="enc" erros={r?.erros} />
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
