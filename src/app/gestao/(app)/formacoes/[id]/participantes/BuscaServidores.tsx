'use client';

import { useEffect, useState, useTransition } from 'react';
import { CircleAlert, Search, UserPlus } from 'lucide-react';
import { pesquisarServidores, vincular, type ServidorEncontrado } from '@/lib/acoes/gestao';
import { useAvisar } from '@/components/Avisos';

export function BuscaServidores({ formacaoId, encerrada }: { formacaoId: string; encerrada: boolean }) {
  const [q, setQ] = useState('');
  const [resBruto, setRes] = useState<ServidorEncontrado[] | null>(null);
  // Resultados só valem enquanto houver pelo menos 2 caracteres digitados.
  const res = q.trim().length >= 2 ? resBruto : null;
  const [buscando, iniciar] = useTransition();
  const [vinculando, setVinculando] = useState<string | null>(null);
  const avisar = useAvisar();

  async function vincularServidor(s: ServidorEncontrado) {
    setVinculando(s.id);
    const dados = new FormData();
    dados.set('formacaoId', formacaoId);
    dados.set('servidorId', s.id);
    const r = await vincular(null, dados);
    setVinculando(null);
    avisar?.(r);
    if (r?.ok) {
      setQ('');
      setRes(null);
    }
  }

  useEffect(() => {
    const termo = q.trim();
    if (termo.length < 2) return;
    // Pequena espera para não consultar a cada tecla.
    const t = setTimeout(() => iniciar(async () => setRes(await pesquisarServidores(formacaoId, termo))), 250);
    return () => clearTimeout(t);
  }, [q, formacaoId]);

  return (
    <section className="cartao" aria-labelledby="t-busca">
      <div className="cartao-corpo pilha g14">
        <div className="pilha g6">
          <h2 id="t-busca" className="titulo-secao">
            Vincular servidores
          </h2>
          <p className="pequeno texto-3">
            A busca consulta a base de servidores da SEMED. Ao vincular, o acesso ao portal é liberado e o aviso vai
            para o e-mail institucional.
          </p>
        </div>
        {encerrada ? (
          <p className="aviso aviso-alerta">
            <CircleAlert size={18} aria-hidden="true" /> Formação encerrada: não é possível vincular novos servidores.
          </p>
        ) : (
          <>
            <div className="campo">
              <label htmlFor="busca" className="sr-only">
                Buscar servidor
              </label>
              <div className="com-icone">
                <Search size={18} aria-hidden="true" />
                <input
                  id="busca"
                  type="search"
                  className="entrada"
                  placeholder="Buscar por nome, CPF ou matrícula"
                  autoComplete="off"
                  value={q}
                  maxLength={80}
                  onChange={e => setQ(e.target.value)}
                  aria-describedby="busca-status"
                />
              </div>
            </div>
            <p id="busca-status" className="dica" role="status" aria-live="polite">
              {q.trim().length < 2
                ? 'Digite pelo menos 2 caracteres.'
                : buscando
                  ? 'Buscando…'
                  : res
                    ? res.length
                      ? `${res.length} servidor(es) encontrado(s)${res.length === 6 ? ' — refine a busca para ver outros' : ''}.`
                      : ''
                    : ''}
            </p>
            {res && !res.length && !buscando ? (
              <p className="aviso aviso-alerta">
                <CircleAlert size={18} aria-hidden="true" /> Nenhum servidor encontrado na base da SEMED (ou já
                vinculado). Confira nome, CPF ou matrícula.
              </p>
            ) : null}
            {res?.length ? (
              <ul className="resultados">
                {res.map(s => (
                  <li key={s.id}>
                    <div className="celula-nome">
                      <strong>{s.nome}</strong>
                      <span>{[s.funcao, s.lotacao].filter(Boolean).join(' · ')}</span>
                    </div>
                    <span className="num pequeno texto-2">{s.cpfMascara}</span>
                    <span className="num pequeno texto-2">Mat. {s.matricula}</span>
                    <span className="pequeno texto-3 email">{s.email}</span>
                    <button
                      type="button"
                      className="botao botao-primario botao-pequeno"
                      aria-label={`Vincular ${s.nome}`}
                      disabled={vinculando !== null}
                      aria-busy={vinculando === s.id}
                      onClick={() => vincularServidor(s)}
                    >
                      <UserPlus size={15} aria-hidden="true" /> {vinculando === s.id ? 'Vinculando…' : 'Vincular'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
