import type { Metadata } from 'next';
import Link from 'next/link';
import { CircleCheck, ClipboardList } from 'lucide-react';
import { Decisao } from '@/components/Decisao';
import { dataCurta } from '@/lib/dominio/regras';
import { listarConferencia } from '@/lib/dominio/servico';
import css from './conferencia.module.css';

export const metadata: Metadata = { title: 'Conferência' };

export default async function Conferencia() {
  const itens = await listarConferencia();
  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">Conferência</p>
          <h1 className="titulo-pagina">Certificados para conferir</h1>
          <p className="texto-3">
            Servidores com frequência abaixo de 80% em formações encerradas. Valide para emitir ou recuse.
          </p>
        </div>
      </div>
      {itens.length ? (
        <ul className={css.lista}>
          {itens.map(({ formacao: f, participante: p }) => {
            const faltas = f.encontros.filter(e => e.realizado && !p.presencas[e.id]).map(e => dataCurta(e.data));
            return (
              <li key={p.participacaoId} className={`cartao ${css.item}`}>
                <div className={css.quem}>
                  <strong>{p.nome}</strong>
                  <span className="pequeno texto-2">{f.formacao.titulo}</span>
                  <span className="pequeno texto-3">Faltas: {faltas.join(', ') || '—'}</span>
                </div>
                <div className={css.freq}>
                  <span className={css.pct}>{p.freqPct}%</span>
                  <span className="pequeno texto-3 num">
                    {p.totalPresencas} de {f.totalEncontros} encontros · {p.cargaCumprida}h
                  </span>
                </div>
                <div className={css.acoes}>
                  <Link
                    href={`/gestao/formacoes/${f.formacao.id}/presenca`}
                    className="botao botao-fantasma botao-pequeno"
                  >
                    <ClipboardList size={15} aria-hidden="true" /> Ver presença
                  </Link>
                  <Decisao participacaoId={p.participacaoId} nome={p.nome} rotuloValidar="Validar e emitir" />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="vazio pilha g10">
          <CircleCheck size={28} aria-hidden="true" className={css.iconeVazio} />
          <p>Nenhum certificado aguardando conferência.</p>
        </div>
      )}
    </>
  );
}
