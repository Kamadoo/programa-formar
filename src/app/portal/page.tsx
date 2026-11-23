import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarClock, ChevronDown } from 'lucide-react';
import { ChipParticipacao } from '@/components/Status';
import { exigirServidor } from '@/lib/auth/sessao';
import { certificadoLiberado, dataBR, minimoEncontros, primeiroNome } from '@/lib/dominio/regras';
import { formacoesDoServidor } from '@/lib/dominio/servico';
import { hojeISO } from '@/lib/dominio/datas';
import css from './portal.module.css';

export const metadata: Metadata = { title: 'Meus cursos' };

const FILTROS = [
  ['todos', 'Todos'],
  ['concluidos', 'Concluídos'],
  ['andamento', 'Em andamento']
] as const;

export default async function MeusCursos({ searchParams }: PageProps<'/portal'>) {
  const s = await exigirServidor();
  const { filtro: f } = await searchParams;
  const filtro = f === 'concluidos' || f === 'andamento' ? f : 'todos';
  const lista = await formacoesDoServidor(s.id);
  const hoje = hojeISO();
  const concluidos = lista.filter(x => x.eu.status !== 'em_andamento');
  const horas = lista
    .filter(x => certificadoLiberado(x.eu.status) && x.eu.certificado)
    .reduce((t, x) => t + x.eu.cargaCumprida, 0);
  const visiveis =
    filtro === 'concluidos'
      ? concluidos
      : filtro === 'andamento'
        ? lista.filter(x => x.eu.status === 'em_andamento')
        : lista;

  return (
    <>
      <section className={`cartao ${css.boasVindas}`} aria-labelledby="t-ola">
        <div className="pilha g6">
          <p className="sobretitulo">Meus cursos</p>
          <h1 id="t-ola" className="titulo-pagina">
            Olá, {primeiroNome(s.nome)}.
          </h1>
          <p className="texto-3">{[s.funcao, s.lotacao].filter(Boolean).join(' · ')}</p>
        </div>
        <dl className={css.kpis}>
          <div>
            <dt>Cursos concluídos</dt>
            <dd>{concluidos.length}</dd>
          </div>
          <div>
            <dt>Horas certificadas</dt>
            <dd>{horas}h</dd>
          </div>
          <div>
            <dt>Em andamento</dt>
            <dd>{lista.length - concluidos.length}</dd>
          </div>
        </dl>
      </section>

      <section className="pilha g14" aria-labelledby="t-lista">
        <div className="linha entre">
          <h2 id="t-lista" className="titulo-secao">
            Minhas formações
          </h2>
          <nav aria-label="Filtrar formações" className="segmentado">
            {FILTROS.map(([v, r]) => (
              <Link
                key={v}
                href={v === 'todos' ? '/portal' : `/portal?filtro=${v}`}
                aria-current={filtro === v ? 'true' : undefined}
                scroll={false}
              >
                {r}
              </Link>
            ))}
          </nav>
        </div>

        {visiveis.length ? (
          <ul className={css.cursos}>
            {visiveis.map(({ det, eu }) => {
              const proximo = det.encontros.find(e => !e.realizado);
              const min = minimoEncontros(det.totalEncontros, det.freqMinima);
              return (
                <li key={det.formacao.id} className={`cartao ${css.curso}`}>
                  <div className={css.cursoCorpo}>
                    <div className="pilha g10">
                      <ChipParticipacao status={eu.status} portal />
                      <h3 className={css.cursoTitulo}>{det.formacao.titulo}</h3>
                      <p className="pequeno texto-3">
                        {det.formacao.formador} · {det.cargaTotal}h · {det.periodo}
                      </p>
                    </div>
                    <div className={css.freq}>
                      <p className="rotulo">Frequência · mín. 80%</p>
                      <p className={css.pct}>{eu.freqPct}%</p>
                      <progress
                        className={`barra ${eu.totalPresencas < min && det.realizados === det.totalEncontros ? 'alerta' : ''}`}
                        max={100}
                        value={eu.freqPct}
                        aria-label={`Frequência ${eu.freqPct}%`}
                      />
                      <p className="pequeno texto-3 num">
                        {eu.totalPresencas} presença(s) · {det.realizados} de {det.totalEncontros} encontros realizados
                      </p>
                    </div>
                  </div>
                  {eu.status === 'em_andamento' && proximo ? (
                    <p className={css.nota}>
                      <CalendarClock size={16} aria-hidden="true" />
                      {proximo.data >= hoje
                        ? `Próximo encontro: ${dataBR(proximo.data)} · ${proximo.modulo}`
                        : `Encontro de ${dataBR(proximo.data)} aguardando o lançamento da presença pelo núcleo de formação.`}
                    </p>
                  ) : eu.status === 'em_conferencia' ? (
                    <p className={`${css.nota} ${css.notaAlerta}`}>
                      Sua frequência ficou abaixo de 80%. O núcleo de formação está conferindo sua participação.
                    </p>
                  ) : eu.status === 'recusado' ? (
                    <p className={`${css.nota} ${css.notaErro}`}>
                      Certificado não emitido por frequência insuficiente.
                      {eu.motivoRecusa ? ` Observação: ${eu.motivoRecusa}` : ''} Dúvidas? Fale com o núcleo de formação.
                    </p>
                  ) : null}
                  <details className={css.detalhes}>
                    <summary>
                      <span>Ver minha frequência</span>
                      <ChevronDown size={16} aria-hidden="true" />
                    </summary>
                    <div className={css.painelFreq}>
                      <p className="pequeno texto-3">
                        Somente consulta · presença lançada pelo núcleo de formação da SEMED.
                      </p>
                      <ol className={css.encontros}>
                        {det.encontros.map(e => {
                          const p = eu.presencas[e.id];
                          return (
                            <li key={e.id}>
                              <span className="texto-3 num">E{e.ordem}</span>
                              <span className="num">{dataBR(e.data)}</span>
                              <span>{e.modulo}</span>
                              {!e.realizado ? (
                                <span className="chip">Agendado</span>
                              ) : p ? (
                                <span className="chip chip-ok">Presente</span>
                              ) : (
                                <span className="chip chip-erro">Falta</span>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </details>
                  {certificadoLiberado(eu.status) && eu.certificado ? (
                    <div className={css.acaoCert}>
                      <Link
                        href={`/portal/certificados/${eu.certificado.id}`}
                        className="botao botao-primario botao-pequeno"
                      >
                        Ver certificado <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="vazio">
            {lista.length ? 'Nenhuma formação neste filtro.' : 'Você ainda não foi vinculado(a) a nenhuma formação.'}
          </p>
        )}
        <p className="pequeno texto-3">
          Alguma formação ou presença não aparece? Fale com o núcleo de formação da SEMED.
        </p>
      </section>
    </>
  );
}
