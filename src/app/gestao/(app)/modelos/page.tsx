import type { Metadata } from 'next';
import { Info } from 'lucide-react';
import { CertificadoPreview, type DadosCertificado } from '@/components/certificado/CertificadoPreview';
import { db, schema } from '@/db';
import { env } from '@/lib/env';
import { dataBR, dataExtenso, parseConteudo } from '@/lib/dominio/regras';
import { hojeISO } from '@/lib/dominio/datas';

export const metadata: Metadata = { title: 'Modelos' };

export default async function Modelos() {
  const d = await db();
  const modelos = await d.select().from(schema.modeloCertificado);
  const hoje = hojeISO();
  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">Modelos</p>
          <h1 className="titulo-pagina">Modelos de certificado</h1>
          <p className="texto-3">A4 paisagem, frente e verso. As variáveis são preenchidas na emissão.</p>
        </div>
      </div>
      <p className="aviso">
        <Info size={18} aria-hidden="true" /> A arte oficial (fundo e assinaturas digitalizadas) entra no modelo quando
        a SEMED enviar os arquivos em alta resolução.
      </p>
      {modelos.map(m => {
        const exemplo: DadosCertificado = {
          nome: 'Nome Completo do Servidor',
          formacao: 'Nome da formação como sai no certificado',
          cargaTotal: 60,
          cargaCumprida: 54,
          cargaPresencial: 40,
          cargaEstudo: 20,
          presencialCumprida: 36,
          estudoCumprida: 18,
          cidade: m.cidade,
          dataExtenso: dataExtenso(hoje),
          dataEmissaoBR: dataBR(hoje),
          assinaturas: m.assinaturas,
          modulos: parseConteudo('Módulo 1\n- Primeiro tema\n- Segundo tema\nMódulo 2\n- Terceiro tema\nMódulo 3'),
          codigo: `PNL-${hoje.slice(0, 4)}-PREFIXO-0001-XXXXX`,
          urlValidacao: new URL(env().SITE_URL).host + '/validar'
        };
        return (
          <section key={m.id} className="cartao" aria-labelledby={`m-${m.id}`}>
            <div className="cartao-cabeca">
              <h2 id={`m-${m.id}`} className="titulo-secao">
                {m.nome}
              </h2>
              {m.emUso ? <span className="chip chip-ok">Em uso</span> : null}
            </div>
            <div className="cartao-corpo grade-modelo">
              <div className="pilha g10">
                <p className="rotulo">Frente</p>
                <CertificadoPreview dados={exemplo} lado="frente" />
              </div>
              <div className="pilha g10">
                <p className="rotulo">Verso</p>
                <CertificadoPreview dados={exemplo} lado="verso" />
              </div>
            </div>
            <div className="cartao-corpo borda-topo">
              <dl className="lista-dados">
                {m.assinaturas.map((a, i) => (
                  <div key={i}>
                    <dt>Assinatura {i + 1}</dt>
                    <dd>
                      {a.nome} <span className="texto-3 pequeno">· {a.cargo}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        );
      })}
    </>
  );
}
