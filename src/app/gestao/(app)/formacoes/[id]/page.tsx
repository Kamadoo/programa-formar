import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { CertificadoPreview } from '@/components/certificado/CertificadoPreview';
import { dadosCertificado } from '@/lib/dominio/certificado-dados';
import { FormFormacao } from '../FormFormacao';
import { Encontros } from './Encontros';
import { carregarFormacao } from './dados';
import { exigirGestor } from '@/lib/auth/sessao';
import { ExcluirFormacao } from './ExcluirFormacao';

export const metadata: Metadata = { title: 'Dados da formação' };

export default async function DadosFormacao({ params, searchParams }: PageProps<'/gestao/formacoes/[id]'>) {
  const { id } = await params;
  const { criada } = await searchParams;
  const d = await carregarFormacao(id);
  const g = await exigirGestor();
  const admin = g.perfil === 'admin';
  const f = d.formacao;
  const exemplo = dadosCertificado(d, d.participantes[0]);

  return (
    <div className="colunas">
      <div className="pilha g22">
        {criada ? (
          <p className="aviso aviso-ok" role="status">
            <CircleCheck size={18} aria-hidden="true" /> Formação criada. Agora adicione os encontros e vincule os
            servidores.
          </p>
        ) : null}
        <section className="cartao cartao-corpo pilha" aria-labelledby="t-dados">
          <h2 id="t-dados" className="titulo-secao">
            Dados da formação
          </h2>
          <FormFormacao
            recemCriada={Boolean(criada)}
            periodo={d.periodo}
            valores={{
              id: f.id,
              titulo: f.titulo,
              tituloCurto: f.tituloCurto,
              programaEixo: f.programaEixo,
              formador: f.formador,
              local: f.local,
              cargaPresencialH: f.cargaPresencialH,
              cargaEstudoH: f.cargaEstudoH,
              conteudoProgramatico: f.conteudoProgramatico,
              prefixoCodigo: f.prefixoCodigo
            }}
          />
        </section>
        <Encontros
          admin={admin}
          formacaoId={f.id}
          encontros={d.encontros.map(e => ({
            id: e.id,
            ordem: e.ordem,
            data: e.data,
            modulo: e.modulo,
            realizado: e.realizado
          }))}
        />
        <div className="linha">
          <Link href={`/gestao/formacoes/${f.id}/participantes`} className="botao">
            Próximo: vincular servidores <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {admin ? <ExcluirFormacao formacaoId={f.id} titulo={f.titulo} /> : null}
      </div>

      <aside className="pilha g18">
        <section className="cartao" aria-labelledby="t-vars">
          <div className="cartao-cabeca">
            <h2 id="t-vars" className="titulo-secao">
              Variáveis do certificado
            </h2>
          </div>
          <dl className="lista-vars">
            {[
              ['{nome_completo}', 'Base de servidores', exemplo.nome],
              ['{formacao}', 'Nome da formação', f.titulo],
              ['{carga_total}', 'Presencial + estudo', `${d.cargaTotal}h`],
              ['{carga_cumprida}', 'Presença × carga', `${exemplo.cargaCumprida}h`],
              ['{periodo}', 'Encontros', d.periodo],
              ['{data_emissao}', 'Último encontro ou validação', exemplo.dataEmissaoBR],
              ['{codigo_validacao}', 'Gerado na emissão', exemplo.codigo],
              ['{conteudo_programatico}', 'Vai no verso', `${exemplo.modulos.length} módulo(s)`]
            ].map(([v, o, ex]) => (
              <div key={v}>
                <dt>
                  <code>{v}</code>
                  <span>{o}</span>
                </dt>
                <dd>{ex}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="pilha g10" aria-label="Prévia do certificado">
          <p className="rotulo">Prévia · frente</p>
          <CertificadoPreview dados={exemplo} lado="frente" />
          <p className="rotulo">Prévia · verso</p>
          <CertificadoPreview dados={exemplo} lado="verso" />
        </section>
      </aside>
    </div>
  );
}
