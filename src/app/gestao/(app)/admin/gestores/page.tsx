import type { Metadata } from 'next';
import { asc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { exigirAdmin } from '@/lib/auth/sessao';
import { dataHoraBR } from '@/lib/dominio/datas';
import { decifrarOuNulo } from '@/lib/cripto';
import { mascararDocumento } from '@/lib/dominio/regras';
import { AcoesGestor, NovoGestor } from './Componentes';

export const metadata: Metadata = { title: 'Contas da gestão' };

export default async function Gestores() {
  const adm = await exigirAdmin();
  const d = await db();
  const lista = await d
    .select({
      id: schema.gestor.id,
      nome: schema.gestor.nome,
      email: schema.gestor.email,
      usuario: schema.gestor.usuario,
      perfil: schema.gestor.perfil,
      ativo: schema.gestor.ativo,
      totp: schema.gestor.totpAtivadoEm,
      ultimo: schema.gestor.ultimoLoginEm,
      concluido: schema.gestor.primeiroAcessoEm,
      documentoTipo: schema.gestor.documentoTipo,
      documentoCifrado: schema.gestor.documentoCifrado
    })
    .from(schema.gestor)
    .orderBy(asc(schema.gestor.nome));
  const docMascarado = (g: (typeof lista)[number]) => {
    if (!g.documentoTipo || !g.documentoCifrado) return null;
    const v = decifrarOuNulo(g.documentoCifrado, 'documento gestor');
    return v ? `${g.documentoTipo.toUpperCase()} ${mascararDocumento(g.documentoTipo, v)}` : null;
  };

  return (
    <div className="colunas">
      <section className="cartao" aria-labelledby="t-contas">
        <div className="cartao-cabeca">
          <h2 id="t-contas" className="titulo-secao">
            Contas da gestão · <span className="num">{lista.length}</span>
          </h2>
        </div>
        <div>
          <table className="tabela tabela-ajustada tabela-gestores">
            <thead>
              <tr>
                <th scope="col">Pessoa</th>
                <th scope="col">Situação</th>
                <th scope="col">Duas etapas</th>
                <th scope="col">Último acesso</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.map(g => (
                <tr key={g.id}>
                  <td data-rotulo="Nome">
                    <div className="celula-nome">
                      <strong>
                        {g.nome} {g.id === adm.id ? <span className="texto-3">(você)</span> : null}
                      </strong>
                      <span className="mono">{g.usuario}</span>
                      <span className="quebra-livre texto-3">{g.email}</span>
                      {docMascarado(g) ? <span className="mono texto-3 pequeno">{docMascarado(g)}</span> : null}
                    </div>
                  </td>
                  <td data-rotulo="Situação">
                    {g.perfil === 'admin' ? (
                      <span className="chip chip-info">Administrador</span>
                    ) : !g.ativo ? (
                      <span className="chip chip-erro">Desativada</span>
                    ) : !g.concluido && !g.documentoTipo ? (
                      <span className="chip chip-alerta">Falta CPF/CNPJ</span>
                    ) : !g.concluido ? (
                      <span className="chip chip-alerta">Convite pendente</span>
                    ) : (
                      <span className="chip chip-ok">Ativa</span>
                    )}
                  </td>
                  <td data-rotulo="Duas etapas">
                    {g.totp ? <span className="chip chip-ok">Ativa</span> : <span className="chip">A configurar</span>}
                  </td>
                  <td data-rotulo="Último acesso" className="pequeno">
                    {g.ultimo ? dataHoraBR(g.ultimo) : '—'}
                  </td>
                  <td className="direita">
                    {g.perfil !== 'admin' ? (
                      <AcoesGestor
                        id={g.id}
                        nome={g.nome}
                        email={g.email}
                        ativo={g.ativo}
                        temTotp={Boolean(g.totp)}
                        concluido={Boolean(g.concluido)}
                        documento={docMascarado(g)}
                        documentoTipo={g.documentoTipo}
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <aside className="pilha g18">
        <NovoGestor />
        <section className="cartao cartao-corpo pilha g10 pequeno texto-2" aria-label="Regras das contas">
          <p className="rotulo">Como funciona</p>
          <ul className="lista-simples">
            <li>Cada conta tem um CPF ou um CNPJ, escolhido no cadastro.</li>
            <li>
              A pessoa recebe um e-mail e faz o primeiro acesso com esse documento: código no e-mail, aplicativo
              autenticador (obrigatório) e senha.
            </li>
            <li>Depois entra com o usuário, a senha e o código do aplicativo.</li>
            <li>&ldquo;Zerar acesso&rdquo; apaga a senha e o aplicativo e manda refazer o primeiro acesso.</li>
            <li>Contas de administrador não são criadas aqui: só pelo terminal do servidor.</li>
            <li>Desativar encerra na hora todas as sessões da pessoa.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
