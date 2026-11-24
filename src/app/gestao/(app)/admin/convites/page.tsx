import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { dataBR } from '@/lib/dominio/datas';
import { lerFiltrosConvite, MAX_CONVITES_POR_ENVIO, ROTULO_SITUACAO } from '@/lib/dominio/convites-filtros';
import { listarPendentes, opcoesFiltros, POR_PAGINA_CONVITES } from '@/lib/dominio/convites';
import { ListaConvites, type LinhaConvite } from './Componentes';

export const metadata: Metadata = { title: 'Convites de primeiro acesso' };

export default async function Convites({ searchParams }: PageProps<'/gestao/admin/convites'>) {
  const f = lerFiltrosConvite(await searchParams);
  const [{ lista, total, totalPendentes }, opcoes] = await Promise.all([listarPendentes(f), opcoesFiltros()]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA_CONVITES));
  const filtrado = Boolean(f.q || f.lotacao || f.funcao || f.convite !== 'todos' || f.criacao !== 'qualquer');
  const url = (p: number) =>
    `?${new URLSearchParams({
      ...(f.q ? { q: f.q } : {}),
      ...(f.lotacao ? { lotacao: f.lotacao } : {}),
      ...(f.funcao ? { funcao: f.funcao } : {}),
      ...(f.convite !== 'todos' ? { convite: f.convite } : {}),
      ...(f.criacao !== 'qualquer' ? { criacao: f.criacao } : {}),
      p: String(p)
    })}`;

  const linhas: LinhaConvite[] = lista.map(l => ({
    id: l.id,
    nome: l.nome,
    email: l.email,
    matricula: l.matricula,
    detalhe: [l.funcao, l.lotacao].filter(Boolean).join(' · '),
    criadoEm: dataBR(l.criadoEm),
    situacao: l.situacao,
    rotuloSituacao: ROTULO_SITUACAO[l.situacao],
    envios: l.envios,
    ultimoEnvio: l.ultimoEnvio ? dataBR(l.ultimoEnvio) : null,
    emailValido: l.emailValido
  }));

  return (
    <section className="cartao" aria-labelledby="t-convites">
      <div className="cartao-cabeca">
        <div>
          <h2 id="t-convites" className="titulo-secao">
            Contas que aguardam o primeiro acesso · <span className="num">{totalPendentes}</span>
          </h2>
          <p className="pequeno texto-3">
            Servidores ativos da base que ainda não ativaram o portal. Marque quem deve receber o e-mail padrão que
            apresenta o Programa Formar e explica o primeiro acesso. O envio libera o acesso ao portal de quem ainda não
            tinha. Até {MAX_CONVITES_POR_ENVIO} por vez.
          </p>
        </div>
      </div>
      <form className="cartao-corpo filtros" role="search" aria-label="Filtrar contas">
        <div className="campo cresce">
          <label htmlFor="c-q">Buscar</label>
          <div className="com-icone">
            <Search size={18} aria-hidden="true" />
            <input
              id="c-q"
              name="q"
              type="search"
              className="entrada"
              defaultValue={f.q}
              placeholder="Nome, e-mail, matrícula ou CPF completo"
              maxLength={80}
            />
          </div>
        </div>
        <div className="campo">
          <label htmlFor="c-lot">Lotação</label>
          <select id="c-lot" name="lotacao" className="entrada" defaultValue={f.lotacao}>
            <option value="">Todas as lotações</option>
            {opcoes.lotacoes.temVazio ? <option value="-">Sem lotação</option> : null}
            {opcoes.lotacoes.valores.map(v => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="c-fun">Função</label>
          <select id="c-fun" name="funcao" className="entrada" defaultValue={f.funcao}>
            <option value="">Todas as funções</option>
            {opcoes.funcoes.temVazio ? <option value="-">Sem função</option> : null}
            {opcoes.funcoes.valores.map(v => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="c-conv">Convite</label>
          <select id="c-conv" name="convite" className="entrada" defaultValue={f.convite}>
            <option value="todos">Todos os convites</option>
            <option value="nunca">Nunca enviado</option>
            <option value="enviado">Já enviado</option>
            <option value="enviado7">Enviado há mais de 7 dias</option>
            <option value="na_fila">Na fila de envio</option>
            <option value="falhou">Falha no envio</option>
          </select>
        </div>
        <div className="campo">
          <label htmlFor="c-cri">Na base desde</label>
          <select id="c-cri" name="criacao" className="entrada" defaultValue={f.criacao}>
            <option value="qualquer">Qualquer data</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="mais30">Há mais de 30 dias</option>
          </select>
        </div>
        <div className="linha g6">
          <button type="submit" className="botao">
            Filtrar
          </button>
          {filtrado ? (
            <Link href="/gestao/admin/convites" className="botao botao-fantasma">
              Limpar filtros
            </Link>
          ) : null}
        </div>
      </form>
      {linhas.length ? (
        <ListaConvites linhas={linhas} total={total} />
      ) : (
        <p className="cartao-corpo texto-3">
          {totalPendentes ? 'Nenhuma conta com esses filtros.' : 'Nenhuma conta aguardando o primeiro acesso.'}
        </p>
      )}
      {paginas > 1 ? (
        <nav className="paginacao" aria-label="Páginas">
          {f.pagina > 1 ? <Link href={url(f.pagina - 1)}>Anterior</Link> : <span aria-hidden="true" />}
          <span className="pequeno texto-3">
            Página {f.pagina} de {paginas}
          </span>
          {f.pagina < paginas ? <Link href={url(f.pagina + 1)}>Próxima</Link> : <span aria-hidden="true" />}
        </nav>
      ) : null}
    </section>
  );
}
