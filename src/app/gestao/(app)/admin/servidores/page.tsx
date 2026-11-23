import type { Metadata } from 'next';
import Link from 'next/link';
import { and, asc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { Download, Search } from 'lucide-react';
import { db, schema as s } from '@/db';
import { hashCpf } from '@/lib/cripto';
import { normalizarBusca, somenteDigitos } from '@/lib/dominio/regras';
import { dataHoraBR } from '@/lib/dominio/datas';
import { GerenciarServidor, ImportarPlanilha } from './Componentes';

export const metadata: Metadata = { title: 'Base de servidores' };

const POR_PAGINA = 30;

export default async function Servidores({ searchParams }: PageProps<'/gestao/admin/servidores'>) {
  const sp = await searchParams;
  const q = String(sp.q ?? '')
    .trim()
    .slice(0, 80);
  const situacao = sp.situacao === 'inativos' ? 'inativos' : sp.situacao === 'todos' ? 'todos' : 'ativos';
  const pagina = Math.max(1, Number(sp.p) || 1);

  const cond: SQL[] = [];
  if (situacao !== 'todos') cond.push(eq(s.servidor.ativo, situacao === 'ativos'));
  if (q.length >= 2) {
    const dig = somenteDigitos(q);
    const termo = normalizarBusca(q).replace(/[%_\\]/g, '');
    const ou: SQL[] = [ilike(s.servidor.nomeBusca, `%${termo}%`), ilike(s.servidor.emailInstitucional, `%${termo}%`)];
    if (dig.length >= 2) ou.push(ilike(s.servidor.matricula, `${dig}%`));
    if (dig.length === 11) ou.push(eq(s.servidor.cpfHash, hashCpf(dig)));
    cond.push(or(...ou)!);
  }
  const onde = cond.length ? and(...cond) : undefined;
  const d = await db();
  const [{ total }] = await d
    .select({ total: sql<number>`count(*)::int` })
    .from(s.servidor)
    .where(onde);
  const lista = await d
    .select({
      id: s.servidor.id,
      nome: s.servidor.nomeCompleto,
      cpf: s.servidor.cpfMascara,
      matricula: s.servidor.matricula,
      email: s.servidor.emailInstitucional,
      funcao: s.servidor.funcao,
      lotacao: s.servidor.lotacao,
      ativo: s.servidor.ativo,
      atualizado: s.servidor.atualizadoEm,
      conta: s.usuarioPortal.servidorId,
      ativadoEm: s.usuarioPortal.primeiroAcessoEm,
      usuario: s.usuarioPortal.usuario
    })
    .from(s.servidor)
    .leftJoin(s.usuarioPortal, eq(s.usuarioPortal.servidorId, s.servidor.id))
    .where(onde)
    .orderBy(asc(s.servidor.nomeCompleto))
    .limit(POR_PAGINA)
    .offset((pagina - 1) * POR_PAGINA);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const url = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), situacao, p: String(p) })}`;

  return (
    <div className="pilha g22">
      <ImportarPlanilha />

      <section className="cartao" aria-labelledby="t-base">
        <div className="cartao-cabeca">
          <h2 id="t-base" className="titulo-secao">
            Servidores na base · <span className="num">{total}</span>
          </h2>
          <a href="/gestao/admin/servidores/modelo" className="botao botao-pequeno" download>
            <Download size={15} aria-hidden="true" /> Planilha modelo
          </a>
        </div>
        <form className="cartao-corpo filtros" role="search" aria-label="Filtrar servidores">
          <div className="campo cresce">
            <label htmlFor="f-q">Buscar</label>
            <div className="com-icone">
              <Search size={18} aria-hidden="true" />
              <input
                id="f-q"
                name="q"
                type="search"
                className="entrada"
                defaultValue={q}
                placeholder="Nome, e-mail, matrícula ou CPF completo"
                maxLength={80}
              />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="f-sit">Situação</label>
            <select id="f-sit" name="situacao" className="entrada" defaultValue={situacao}>
              <option value="ativos">Ativos</option>
              <option value="inativos">Desativados</option>
              <option value="todos">Todos</option>
            </select>
          </div>
          <button type="submit" className="botao">
            Filtrar
          </button>
        </form>
        {lista.length ? (
          <table className="tabela tabela-ajustada">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">CPF · Matrícula</th>
                <th scope="col">E-mail institucional</th>
                <th scope="col">Portal</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.map(x => (
                <tr key={x.id}>
                  <td data-rotulo="Nome">
                    <div className="celula-nome">
                      <strong>
                        {x.nome} {!x.ativo ? <span className="chip chip-erro">Desativado</span> : null}
                      </strong>
                      <span>{[x.funcao, x.lotacao].filter(Boolean).join(' · ')}</span>
                    </div>
                  </td>
                  <td data-rotulo="CPF · Matrícula">
                    <div className="celula-nome">
                      <span className="num sem-quebra">{x.cpf}</span>
                      <span className="num">Mat. {x.matricula}</span>
                    </div>
                  </td>
                  <td data-rotulo="E-mail" className="pequeno quebra-livre">
                    {x.email}
                  </td>
                  <td data-rotulo="Portal">
                    {x.ativadoEm ? (
                      <div className="celula-nome">
                        <span className="chip chip-ok">Ativo</span>
                        {x.usuario ? <span className="mono">{x.usuario}</span> : null}
                      </div>
                    ) : x.conta ? (
                      <span className="chip chip-alerta">Aguardando 1º acesso</span>
                    ) : (
                      <span className="chip">Sem acesso</span>
                    )}
                  </td>
                  <td className="direita">
                    <GerenciarServidor
                      sv={{
                        id: x.id,
                        nome: x.nome,
                        cpf: x.cpf,
                        matricula: x.matricula,
                        email: x.email,
                        funcao: x.funcao,
                        lotacao: x.lotacao,
                        ativo: x.ativo,
                        temAcesso: Boolean(x.ativadoEm),
                        atualizado: dataHoraBR(x.atualizado)
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="cartao-corpo texto-3">Nenhum servidor encontrado.</p>
        )}
        {paginas > 1 ? (
          <nav className="paginacao" aria-label="Páginas">
            {pagina > 1 ? <Link href={url(pagina - 1)}>Anterior</Link> : <span aria-hidden="true" />}
            <span className="pequeno texto-3">
              Página {pagina} de {paginas}
            </span>
            {pagina < paginas ? <Link href={url(pagina + 1)}>Próxima</Link> : <span aria-hidden="true" />}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
