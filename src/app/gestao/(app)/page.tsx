import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, ClipboardCheck, GraduationCap, Plus, UsersRound } from 'lucide-react';
import { ChipFormacao } from '@/components/Status';
import { listarFormacoes } from '@/lib/dominio/servico';
import { hojeISO } from '@/lib/dominio/datas';
import css from './painel.module.css';

export const metadata: Metadata = { title: 'Painel' };

export default async function Painel() {
  const formacoes = await listarFormacoes();
  const andamento = formacoes.filter(f => f.status === 'em_andamento').length;
  const vinculados = formacoes.reduce((t, f) => t + f.vinculados, 0);
  const liberados = formacoes.reduce((t, f) => t + f.liberados, 0);
  const conferencia = formacoes.reduce((t, f) => t + f.conferencia, 0);
  const ano = hojeISO().slice(0, 4);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">Painel · {ano}</p>
          <h1 className="titulo-pagina">Visão geral</h1>
        </div>
        <Link href="/gestao/formacoes/nova" className="botao botao-primario">
          <Plus size={18} aria-hidden="true" /> Nova formação
        </Link>
      </div>

      <section aria-label="Indicadores" className={css.kpis}>
        <div className={`cartao ${css.kpi}`}>
          <BookOpen size={20} aria-hidden="true" />
          <span className={css.valor}>{andamento}</span>
          <span className={css.rotulo}>Formações em andamento</span>
        </div>
        <div className={`cartao ${css.kpi}`}>
          <UsersRound size={20} aria-hidden="true" />
          <span className={css.valor}>{vinculados}</span>
          <span className={css.rotulo}>Servidores vinculados</span>
        </div>
        <div className={`cartao ${css.kpi}`}>
          <GraduationCap size={20} aria-hidden="true" />
          <span className={css.valor}>{liberados}</span>
          <span className={css.rotulo}>Certificados liberados</span>
        </div>
        <Link href="/gestao/conferencia" className={`cartao ${css.kpi} ${conferencia ? css.kpiAlerta : ''}`}>
          <ClipboardCheck size={20} aria-hidden="true" />
          <span className={css.valor}>{conferencia}</span>
          <span className={css.rotulo}>Aguardando conferência</span>
          <span className={css.legenda}>
            {conferencia ? 'Frequência abaixo de 80% · conferir' : 'Nada pendente'}{' '}
            <ArrowRight size={14} aria-hidden="true" />
          </span>
        </Link>
      </section>

      <section className="cartao" aria-labelledby="t-formacoes">
        <div className="cartao-cabeca">
          <h2 id="t-formacoes" className="titulo-secao">
            Formações
          </h2>
          <Link href="/gestao/formacoes" className="pequeno">
            Ver todas
          </Link>
        </div>
        {formacoes.length ? (
          <div className="tabela-rolagem">
            <table className="tabela">
              <caption className="sr-only">Formações cadastradas e seus números</caption>
              <thead>
                <tr>
                  <th scope="col">Formação</th>
                  <th scope="col">Encontros</th>
                  <th scope="col" className="direita">
                    Vinculados
                  </th>
                  <th scope="col" className="direita">
                    Liberados
                  </th>
                  <th scope="col" className="direita">
                    Conferência
                  </th>
                  <th scope="col">Situação</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {formacoes.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div className="celula-nome">
                        <strong>{f.titulo}</strong>
                        <span>
                          {f.formador} · {f.cargaTotal}h
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={css.progresso}>
                        <span className="pequeno num">
                          {f.realizados} de {f.totalEncontros}
                        </span>
                        <progress
                          className="barra"
                          max={f.totalEncontros || 1}
                          value={f.realizados}
                          aria-label={`${f.realizados} de ${f.totalEncontros} encontros realizados`}
                        />
                      </div>
                    </td>
                    <td className="direita num">{f.vinculados}</td>
                    <td className="direita num">{f.liberados}</td>
                    <td className="direita num">
                      {f.conferencia ? <span className="chip chip-alerta">{f.conferencia}</span> : '—'}
                    </td>
                    <td>
                      <ChipFormacao status={f.status} />
                    </td>
                    <td className="direita">
                      <Link
                        href={`/gestao/formacoes/${f.id}`}
                        className="botao botao-fantasma botao-pequeno"
                        aria-label={`Abrir ${f.titulo}`}
                      >
                        Abrir <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cartao-corpo">
            <p className="vazio">Nenhuma formação cadastrada ainda.</p>
          </div>
        )}
      </section>

      <section aria-labelledby="t-como" className={css.como}>
        <h2 id="t-como" className="rotulo">
          Como funciona
        </h2>
        <ol>
          <li>
            <strong>Cadastre a formação</strong>
            <span>Dados, encontros e conteúdo do verso.</span>
          </li>
          <li>
            <strong>Vincule os servidores</strong>
            <span>Busca na base da SEMED; o acesso é liberado.</span>
          </li>
          <li>
            <strong>Lance a presença</strong>
            <span>Por encontro, a partir da lista assinada.</span>
          </li>
          <li>
            <strong>Certificado ao encerrar</strong>
            <span>≥ 80% sai automático; abaixo vai para conferência.</span>
          </li>
        </ol>
      </section>
    </>
  );
}
