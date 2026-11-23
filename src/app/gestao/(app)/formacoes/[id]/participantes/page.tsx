import type { Metadata } from 'next';
import { FileDown, UserMinus } from 'lucide-react';
import { desvincular } from '@/lib/acoes/gestao';
import { BotaoEnviar, FormAcao } from '@/components/FormAcao';
import { carregarFormacao } from '../dados';
import { BuscaServidores } from './BuscaServidores';

export const metadata: Metadata = { title: 'Participantes' };

export default async function Participantes({ params }: PageProps<'/gestao/formacoes/[id]/participantes'>) {
  const { id } = await params;
  const d = await carregarFormacao(id);
  const encerrada = d.formacao.status === 'encerrada';

  return (
    <div className="pilha g22">
      <BuscaServidores formacaoId={id} encerrada={encerrada} />
      <section className="cartao" aria-labelledby="t-vinc">
        <div className="cartao-cabeca">
          <h2 id="t-vinc" className="titulo-secao">
            Servidores vinculados · <span className="num">{d.participantes.length}</span>
          </h2>
          {d.participantes.length ? (
            <a
              href={`/gestao/formacoes/${id}/lista-presenca`}
              className="botao botao-pequeno"
              target="_blank"
              rel="noopener"
            >
              <FileDown size={15} aria-hidden="true" /> Lista de presença (PDF)
            </a>
          ) : null}
        </div>
        {d.participantes.length ? (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th scope="col">Nome completo</th>
                  <th scope="col">CPF</th>
                  <th scope="col">Matrícula</th>
                  <th scope="col">E-mail institucional</th>
                  <th scope="col">Portal</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.participantes.map(p => (
                  <tr key={p.participacaoId}>
                    <td>
                      <div className="celula-nome">
                        <strong>{p.nome}</strong>
                        <span>{[p.funcao, p.lotacao].filter(Boolean).join(' · ')}</span>
                      </div>
                    </td>
                    <td className="num sem-quebra">{p.cpfMascara}</td>
                    <td className="num">{p.matricula}</td>
                    <td className="pequeno">{p.email}</td>
                    <td>
                      <span className="chip chip-ok">Acesso liberado</span>
                    </td>
                    <td className="direita">
                      {!encerrada ? (
                        <FormAcao
                          acao={desvincular}
                          confirmar={`Remover ${p.nome} desta formação? As presenças lançadas para essa pessoa serão apagadas.`}
                        >
                          <input type="hidden" name="formacaoId" value={id} />
                          <input type="hidden" name="participacaoId" value={p.participacaoId} />
                          <BotaoEnviar className="botao botao-fantasma botao-pequeno" aria-label={`Remover ${p.nome}`}>
                            <UserMinus size={15} aria-hidden="true" /> Remover
                          </BotaoEnviar>
                        </FormAcao>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="cartao-corpo texto-3">Ninguém vinculado ainda. Use a busca acima.</p>
        )}
      </section>
    </div>
  );
}
