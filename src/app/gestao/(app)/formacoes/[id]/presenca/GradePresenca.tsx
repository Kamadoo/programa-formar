'use client';

import { useOptimistic, useTransition } from 'react';
import { alternarPresenca } from '@/lib/acoes/gestao';
import { useAvisar } from '@/components/Avisos';
import { ChipParticipacao } from '@/components/Status';
import {
  aindaPodeAtingir,
  dataCurta,
  frequenciaPct,
  minimoEncontros,
  type StatusParticipacao
} from '@/lib/dominio/regras';
import css from './presenca.module.css';

type Encontro = { id: string; ordem: number; data: string; modulo: string; realizado: boolean };
type Linha = {
  participacaoId: string;
  nome: string;
  matricula: string;
  status: StatusParticipacao;
  presencas: Record<string, boolean>;
};

export function GradePresenca({
  formacaoId,
  encontros,
  linhas,
  freqMinima
}: {
  formacaoId: string;
  encontros: Encontro[];
  linhas: Linha[];
  freqMinima: number;
}) {
  const avisar = useAvisar();
  const [, iniciar] = useTransition();
  const [mapa, mudar] = useOptimistic(
    Object.fromEntries(linhas.map(l => [l.participacaoId, l.presencas])) as Record<string, Record<string, boolean>>,
    (atual, m: { p: string; e: string; v: boolean }) => ({ ...atual, [m.p]: { ...atual[m.p], [m.e]: m.v } })
  );
  const n = encontros.length;
  const realizados = encontros.filter(e => e.realizado).length;

  function clicar(l: Linha, e: Encontro) {
    const novo = !mapa[l.participacaoId]?.[e.id];
    iniciar(async () => {
      mudar({ p: l.participacaoId, e: e.id, v: novo });
      const r = await alternarPresenca(formacaoId, l.participacaoId, e.id, novo);
      if (r && !r.ok) avisar?.(r);
    });
  }

  return (
    <div className="tabela-rolagem">
      <table className={`tabela ${css.grade}`}>
        <caption className="sr-only">
          Presença por encontro. P = presente, F = falta. Clique numa célula de encontro realizado para alternar.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={css.fixa}>
              Servidor
            </th>
            {encontros.map(e => (
              <th key={e.id} scope="col" className="centro" title={e.modulo}>
                <span className={css.enc}>E{e.ordem}</span>
                <span className={css.data}>{dataCurta(e.data)}</span>
              </th>
            ))}
            <th scope="col" className="direita">
              Freq.
            </th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(l => {
            const pres = Object.entries(mapa[l.participacaoId] ?? {}).filter(
              ([eid, v]) => v && encontros.find(x => x.id === eid)?.realizado
            ).length;
            const pct = frequenciaPct(pres, n);
            const risco = !aindaPodeAtingir(pres, realizados, n, freqMinima);
            return (
              <tr key={l.participacaoId}>
                <th scope="row" className={css.fixa}>
                  <div className="celula-nome">
                    <strong>{l.nome}</strong>
                    <span>Mat. {l.matricula}</span>
                  </div>
                </th>
                {encontros.map(e => {
                  if (!e.realizado) {
                    return (
                      <td key={e.id} className="centro">
                        <span
                          className={`${css.cel} ${css.agendado}`}
                          role="img"
                          aria-label={`E${e.ordem}: agendado`}
                        />
                      </td>
                    );
                  }
                  const p = Boolean(mapa[l.participacaoId]?.[e.id]);
                  return (
                    <td key={e.id} className="centro">
                      <button
                        type="button"
                        className={`${css.cel} ${p ? css.p : css.f}`}
                        onClick={() => clicar(l, e)}
                        aria-label={`${l.nome}, E${e.ordem} (${dataCurta(e.data)}): ${p ? 'presente' : 'falta'}. Alternar.`}
                      >
                        {p ? 'P' : 'F'}
                      </button>
                    </td>
                  );
                })}
                <td className={`direita num ${css.freq} ${risco ? css.risco : ''}`}>
                  {pres}/{n} · {pct}%{risco ? <span className="sr-only"> (não atinge mais o mínimo)</span> : null}
                </td>
                <td>
                  <ChipParticipacao status={l.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className={`pequeno texto-3 ${css.legenda}`}>
        <span className={`${css.cel} ${css.p}`} aria-hidden="true">
          P
        </span>{' '}
        presente
        <span className={`${css.cel} ${css.f}`} aria-hidden="true">
          F
        </span>{' '}
        falta
        <span className={`${css.cel} ${css.agendado}`} aria-hidden="true" /> agendado · Frequência mínima: 80% dos
        encontros ({minimoEncontros(n, freqMinima)} de {n}).
      </p>
    </div>
  );
}
