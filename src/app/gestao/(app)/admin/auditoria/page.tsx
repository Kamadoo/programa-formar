import type { Metadata } from 'next';
import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { FileDown } from 'lucide-react';
import { db, schema } from '@/db';
import { ACOES, consultarAuditoria, resumoDetalhes, type FiltroAuditoria } from '@/lib/dominio/auditoria-consulta';
import { dataHoraBR } from '@/lib/dominio/datas';

export const metadata: Metadata = { title: 'Auditoria' };

const TIPOS: Record<string, string> = {
  gestor: 'Gestão',
  servidor: 'Servidor',
  publico: 'Visitante',
  sistema: 'Sistema'
};

export default async function Auditoria({ searchParams }: PageProps<'/gestao/admin/auditoria'>) {
  const sp = await searchParams;
  const f: FiltroAuditoria = {
    de: typeof sp.de === 'string' ? sp.de : undefined,
    ate: typeof sp.ate === 'string' ? sp.ate : undefined,
    atorTipo: typeof sp.tipo === 'string' ? sp.tipo : undefined,
    atorId: typeof sp.pessoa === 'string' ? sp.pessoa : undefined,
    acao: typeof sp.acao === 'string' ? sp.acao : undefined,
    pagina: Number(sp.p) || 1
  };
  const r = await consultarAuditoria(f);
  const d = await db();
  const gestores = await d
    .select({ id: schema.gestor.id, nome: schema.gestor.nome })
    .from(schema.gestor)
    .orderBy(asc(schema.gestor.nome));
  const base = Object.fromEntries(
    Object.entries({ de: f.de, ate: f.ate, tipo: f.atorTipo, pessoa: f.atorId, acao: f.acao }).filter(([, v]) => v) as [
      string,
      string
    ][]
  );
  const url = (p: number) => `?${new URLSearchParams({ ...base, p: String(p) })}`;

  return (
    <section className="cartao" aria-labelledby="t-aud">
      <div className="cartao-cabeca">
        <div className="pilha g6">
          <h2 id="t-aud" className="titulo-secao">
            Registro de atividades · <span className="num">{r.total}</span>
          </h2>
          <p className="pequeno texto-3">
            Somente leitura: o banco de dados recusa qualquer alteração ou exclusão destes registros.
          </p>
        </div>
        <a
          href={`/gestao/admin/auditoria/exportar?${new URLSearchParams(base)}`}
          className="botao botao-pequeno"
          download
        >
          <FileDown size={15} aria-hidden="true" /> Exportar Excel
        </a>
      </div>
      <form className="cartao-corpo filtros" aria-label="Filtros da auditoria">
        <div className="campo">
          <label htmlFor="a-de">De</label>
          <input id="a-de" name="de" type="date" className="entrada" defaultValue={f.de} />
        </div>
        <div className="campo">
          <label htmlFor="a-ate">Até</label>
          <input id="a-ate" name="ate" type="date" className="entrada" defaultValue={f.ate} />
        </div>
        <div className="campo">
          <label htmlFor="a-tipo">Quem</label>
          <select id="a-tipo" name="tipo" className="entrada" defaultValue={f.atorTipo ?? ''}>
            <option value="">Todos</option>
            {Object.entries(TIPOS).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="a-pessoa">Pessoa da gestão</label>
          <select id="a-pessoa" name="pessoa" className="entrada" defaultValue={f.atorId ?? ''}>
            <option value="">Qualquer</option>
            {gestores.map(g => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="campo cresce">
          <label htmlFor="a-acao">Ação</label>
          <select id="a-acao" name="acao" className="entrada" defaultValue={f.acao ?? ''}>
            <option value="">Todas</option>
            {Object.entries(ACOES)
              .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
              .map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
          </select>
        </div>
        <button type="submit" className="botao">
          Filtrar
        </button>
        {Object.keys(base).length ? (
          <Link href="?" className="botao botao-fantasma">
            Limpar
          </Link>
        ) : null}
      </form>
      {r.linhas.length ? (
        <div
          className="tabela-rolagem"
          tabIndex={0}
          role="region"
          aria-label="Registros da auditoria (role para os lados)"
        >
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Quando</th>
                <th scope="col">Quem</th>
                <th scope="col">Ação</th>
                <th scope="col">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {r.linhas.map(l => (
                <tr key={l.id}>
                  <td className="pequeno sem-quebra num">{dataHoraBR(l.em)}</td>
                  <td>
                    <div className="celula-nome">
                      <strong>{l.ator}</strong>
                      <span>{TIPOS[l.atorTipo] ?? l.atorTipo}</span>
                    </div>
                  </td>
                  <td>{l.acaoTexto}</td>
                  <td className="pequeno texto-2 detalhes-aud">
                    <span className="texto-3">{l.entidade}</span> {resumoDetalhes(l.detalhes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="cartao-corpo texto-3">Nenhum registro encontrado com esses filtros.</p>
      )}
      {r.paginas > 1 ? (
        <nav className="paginacao" aria-label="Páginas">
          {r.pagina > 1 ? <Link href={url(r.pagina - 1)}>Anterior</Link> : <span aria-hidden="true" />}
          <span className="pequeno texto-3">
            Página {r.pagina} de {r.paginas}
          </span>
          {r.pagina < r.paginas ? <Link href={url(r.pagina + 1)}>Próxima</Link> : <span aria-hidden="true" />}
        </nav>
      ) : null}
    </section>
  );
}
