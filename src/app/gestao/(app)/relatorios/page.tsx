import type { Metadata } from 'next';
import { BookOpen, Clock, GraduationCap, Printer, UsersRound } from 'lucide-react';
import { ChipFormacao } from '@/components/Status';
import { exigirGestor } from '@/lib/auth/sessao';
import { filtroRelatorio, relatorioFormacoes, ROTULO_SITUACAO, type Situacao } from '@/lib/dominio/relatorios';
import css from '../painel.module.css';

export const metadata: Metadata = { title: 'Relatórios' };

export default async function Relatorios({ searchParams }: PageProps<'/gestao/relatorios'>) {
  await exigirGestor();
  const filtro = filtroRelatorio(await searchParams);
  const r = await relatorioFormacoes(filtro);
  const t = r.totais;
  const qs = new URLSearchParams({ ...(r.ano ? { ano: String(r.ano) } : {}), situacao: r.situacao }).toString();

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">Relatórios</p>
          <h1 className="titulo-pagina">Relatório de formações</h1>
          <p className="texto-3">
            Cursos realizados, horas executadas, servidores participantes e certificados emitidos.
          </p>
        </div>
        <a href={`/gestao/relatorios/pdf?${qs}`} className="botao botao-primario" target="_blank" rel="noopener">
          <Printer size={18} aria-hidden="true" /> Imprimir relatório
        </a>
      </div>

      <section className="cartao">
        <form className="cartao-corpo filtros" aria-label="Filtros do relatório">
          <div className="campo">
            <label htmlFor="r-ano">Ano</label>
            <select id="r-ano" name="ano" className="entrada" defaultValue={r.ano ? String(r.ano) : ''}>
              <option value="">Todos os anos</option>
              {r.anos.map(a => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="r-sit">Situação</label>
            <select id="r-sit" name="situacao" className="entrada" defaultValue={r.situacao}>
              {(Object.keys(ROTULO_SITUACAO) as Situacao[]).map(s => (
                <option key={s} value={s}>
                  {ROTULO_SITUACAO[s]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="botao">
            Filtrar
          </button>
        </form>
      </section>

      <section aria-label="Totais" className={css.kpis}>
        <div className={`cartao ${css.kpi}`}>
          <BookOpen size={20} aria-hidden="true" />
          <span className={css.valor}>{t.encerradas}</span>
          <span className={css.rotulo}>Cursos realizados (encerrados)</span>
          <span className={css.legenda}>{t.formacoes} formação(ões) no filtro</span>
        </div>
        <div className={`cartao ${css.kpi}`}>
          <Clock size={20} aria-hidden="true" />
          <span className={css.valor}>{t.horasExecutadas}h</span>
          <span className={css.rotulo}>Horas de formação executadas</span>
        </div>
        <div className={`cartao ${css.kpi}`}>
          <UsersRound size={20} aria-hidden="true" />
          <span className={css.valor}>{t.servidores}</span>
          <span className={css.rotulo}>Servidores participantes</span>
          <span className={css.legenda}>{t.participacoes} participação(ões)</span>
        </div>
        <div className={`cartao ${css.kpi}`}>
          <GraduationCap size={20} aria-hidden="true" />
          <span className={css.valor}>{t.certificados}</span>
          <span className={css.rotulo}>Certificados emitidos</span>
          <span className={css.legenda}>{t.horasCertificadas}h certificadas</span>
        </div>
      </section>

      <section className="cartao" aria-labelledby="t-rel">
        <div className="cartao-cabeca">
          <h2 id="t-rel" className="titulo-secao">
            Formações
          </h2>
          <span className="pequeno texto-3">
            {r.ano ?? 'Todos os anos'} · {ROTULO_SITUACAO[r.situacao]}
          </span>
        </div>
        {r.linhas.length ? (
          <div className="tabela-rolagem">
            <table className="tabela">
              <caption className="sr-only">Formações do relatório e seus números</caption>
              <thead>
                <tr>
                  <th scope="col">Formação</th>
                  <th scope="col">Situação</th>
                  <th scope="col" className="direita">
                    Encontros
                  </th>
                  <th scope="col" className="direita">
                    Carga
                  </th>
                  <th scope="col" className="direita">
                    Horas executadas
                  </th>
                  <th scope="col" className="direita">
                    Participantes
                  </th>
                  <th scope="col" className="direita">
                    Certificados
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.linhas.map(l => (
                  <tr key={l.id}>
                    <td>
                      <strong>{l.titulo}</strong>
                      <br />
                      <span className="pequeno texto-3">
                        {l.programaEixo} · {l.periodo}
                      </span>
                    </td>
                    <td>
                      <ChipFormacao status={l.status} />
                    </td>
                    <td className="num direita">
                      {l.realizados}/{l.encontros}
                    </td>
                    <td className="num direita">{l.cargaTotal}h</td>
                    <td className="num direita">{l.horasExecutadas}h</td>
                    <td className="num direita">{l.participantes}</td>
                    <td className="num direita">{l.certificados}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={4}>
                    Total
                  </th>
                  <td className="num direita">
                    <strong>{t.horasExecutadas}h</strong>
                  </td>
                  <td className="num direita">
                    <strong>{t.participacoes}</strong>
                  </td>
                  <td className="num direita">
                    <strong>{t.certificados}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="cartao-corpo texto-3">Nenhuma formação com esses filtros.</p>
        )}
      </section>
    </>
  );
}
