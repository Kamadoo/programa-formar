import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, ClipboardList, Plus, UserPlus } from 'lucide-react';
import { ChipFormacao } from '@/components/Status';
import { listarFormacoes } from '@/lib/dominio/servico';
import css from './formacoes.module.css';

export const metadata: Metadata = { title: 'Formações' };

export default async function Formacoes({ searchParams }: PageProps<'/gestao/formacoes'>) {
  const { excluida } = await searchParams;
  const formacoes = await listarFormacoes();
  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">Formações</p>
          <h1 className="titulo-pagina">Formações cadastradas</h1>
        </div>
        <Link href="/gestao/formacoes/nova" className="botao botao-primario">
          <Plus size={18} aria-hidden="true" /> Cadastrar formação
        </Link>
      </div>
      {typeof excluida === 'string' ? (
        <p className="aviso aviso-ok" role="status">
          Formação “{excluida}” excluída.
        </p>
      ) : null}
      {formacoes.length ? (
        <ul className={`grade-cards ${css.lista}`}>
          {formacoes.map(f => (
            <li key={f.id} className={`cartao ${css.card}`}>
              <div className={css.topo}>
                <ChipFormacao status={f.status} />
                {f.conferencia ? <span className="chip chip-alerta">{f.conferencia} em conferência</span> : null}
              </div>
              <h2 className={css.titulo}>
                <Link href={`/gestao/formacoes/${f.id}`}>{f.titulo}</Link>
              </h2>
              <p className="pequeno texto-3">
                {f.formador} · <CalendarDays size={13} aria-hidden="true" className={css.iconeInline} /> {f.periodo}
              </p>
              <dl className={css.numeros}>
                <div>
                  <dt>Carga</dt>
                  <dd>{f.cargaTotal}h</dd>
                </div>
                <div>
                  <dt>Encontros</dt>
                  <dd>
                    {f.realizados}/{f.totalEncontros}
                  </dd>
                </div>
                <div>
                  <dt>Vinculados</dt>
                  <dd>{f.vinculados}</dd>
                </div>
              </dl>
              <div className={css.acoes}>
                <Link href={`/gestao/formacoes/${f.id}`} className="botao botao-primario botao-pequeno">
                  Abrir formação
                </Link>
                <Link
                  href={`/gestao/formacoes/${f.id}/participantes`}
                  className="botao botao-pequeno"
                  aria-label={`Vincular servidores em ${f.titulo}`}
                >
                  <UserPlus size={15} aria-hidden="true" /> Vincular
                </Link>
                <Link
                  href={`/gestao/formacoes/${f.id}/presenca`}
                  className="botao botao-pequeno"
                  aria-label={`Presença de ${f.titulo}`}
                >
                  <ClipboardList size={15} aria-hidden="true" /> Presença
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="vazio">
          Nenhuma formação cadastrada. <Link href="/gestao/formacoes/nova">Cadastre a primeira</Link>.
        </p>
      )}
    </>
  );
}
