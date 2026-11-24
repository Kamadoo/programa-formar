import type { Metadata } from 'next';
import Link from 'next/link';
import { CircleAlert, CircleCheck, FileDown, Info } from 'lucide-react';
import { FREQ_CONFERENCIA, FREQ_MINIMA_PADRAO, pctTexto } from '@/lib/dominio/regras';
import { CertificadoPreview } from '@/components/certificado/CertificadoPreview';
import { Decisao } from '@/components/Decisao';
import { ChipParticipacao } from '@/components/Status';
import { dadosCertificado } from '@/lib/dominio/certificado-dados';
import { certificadoLiberado, nomeArquivoCertificado } from '@/lib/dominio/regras';
import { carregarFormacao } from '../dados';

export const metadata: Metadata = { title: 'Certificados' };

export default async function Certificados({ params, searchParams }: PageProps<'/gestao/formacoes/[id]/certificados'>) {
  const { id } = await params;
  const { p } = await searchParams;
  const d = await carregarFormacao(id);
  const encerrada = d.formacao.status === 'encerrada';
  const sel =
    d.participantes.find(x => x.participacaoId === p) ?? d.participantes.find(x => x.certificado) ?? d.participantes[0];
  const dados = sel ? dadosCertificado(d, sel) : null;

  return (
    <div className="colunas">
      <div className="pilha g18">
        {encerrada ? (
          <div className="pilha g10">
            <p className="aviso aviso-ok">
              <CircleCheck size={18} aria-hidden="true" />
              <span>
                <strong>≥ {pctTexto(FREQ_MINIMA_PADRAO)}</strong> — certificado liberado automaticamente no portal ao
                encerrar a formação.
              </span>
            </p>
            <p className="aviso aviso-alerta">
              <CircleAlert size={18} aria-hidden="true" />
              <span>
                <strong>
                  {pctTexto(FREQ_CONFERENCIA)} a {pctTexto(FREQ_MINIMA_PADRAO)}
                </strong>{' '}
                — fica pendente: o núcleo de formação avalia se libera ou não a emissão.
              </span>
            </p>
            <p className="aviso aviso-erro">
              <CircleAlert size={18} aria-hidden="true" />
              <span>
                <strong>&lt; {pctTexto(FREQ_CONFERENCIA)}</strong> — sem certificado (recusa automática).
              </span>
            </p>
          </div>
        ) : (
          <p className="aviso">
            <Info size={18} aria-hidden="true" /> Formação em andamento. Os certificados são processados quando o último
            encontro for lançado.
          </p>
        )}
        <section className="cartao" aria-labelledby="t-certs">
          <div className="cartao-cabeca">
            <h2 id="t-certs" className="titulo-secao">
              Certificados
            </h2>
          </div>
          {d.participantes.length ? (
            <div className="tabela-rolagem">
              <table className="tabela">
                <thead>
                  <tr>
                    <th scope="col">Servidor</th>
                    <th scope="col" className="direita">
                      Frequência
                    </th>
                    <th scope="col" className="direita">
                      Carga cumprida
                    </th>
                    <th scope="col">Situação</th>
                    <th scope="col">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.participantes.map(x => (
                    <tr key={x.participacaoId} aria-current={x === sel ? 'true' : undefined}>
                      <td>
                        <Link
                          href={`?p=${x.participacaoId}`}
                          scroll={false}
                          className="link-linha"
                          aria-label={`Ver prévia do certificado de ${x.nome}`}
                        >
                          {x.nome}
                        </Link>
                      </td>
                      <td className="direita num">
                        {x.totalPresencas}/{d.totalEncontros} · {x.freqPct}%
                      </td>
                      <td className="direita num">{x.cargaCumprida}h</td>
                      <td>
                        <ChipParticipacao status={x.status} />
                      </td>
                      <td className="direita">
                        {x.status === 'em_conferencia' ? (
                          <Decisao participacaoId={x.participacaoId} nome={x.nome} />
                        ) : certificadoLiberado(x.status) && x.certificado ? (
                          <a
                            href={`/gestao/certificados/${x.certificado.id}/pdf`}
                            className="botao botao-pequeno"
                            target="_blank"
                            rel="noopener"
                          >
                            <FileDown size={15} aria-hidden="true" /> Ver certificado
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="cartao-corpo texto-3">Nenhum servidor vinculado.</p>
          )}
        </section>
      </div>
      {sel && dados ? (
        <aside className="cartao cartao-corpo pilha g14" aria-label="Prévia do certificado selecionado">
          <p className="rotulo">Prévia · {sel.nome}</p>
          <CertificadoPreview dados={dados} lado="frente" />
          <CertificadoPreview dados={dados} lado="verso" />
          <dl className="lista-dados">
            <div>
              <dt>Código</dt>
              <dd className="mono">{sel.certificado?.codigo ?? 'Gerado na emissão'}</dd>
            </div>
            <div>
              <dt>Arquivo</dt>
              <dd className="pequeno">{nomeArquivoCertificado(sel.nome, d.formacao.tituloCurto, sel.cargaCumprida)}</dd>
            </div>
          </dl>
        </aside>
      ) : null}
    </div>
  );
}
