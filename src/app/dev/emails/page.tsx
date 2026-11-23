import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { dataHoraBR } from '@/lib/dominio/datas';
import { env } from '@/lib/env';
import { emailCodigo, emailSenhaAlterada, htmlDeTexto } from '@/lib/email-modelos';

export const metadata: Metadata = { title: 'Caixa de saída (dev)' };

type Item = { id: string; assunto: string; para: string; quando: string; texto: string; html: string | null };

/** Prévia isolada: o HTML do e-mail roda num iframe sem scripts (sandbox), como num cliente de e-mail. */
function Mensagem({ e }: { e: Item }) {
  return (
    <article className="cartao">
      <div className="cartao-cabeca">
        <div className="pilha g6">
          <h2 className="titulo-secao">{e.assunto}</h2>
          <p className="pequeno texto-3">
            Para {e.para} · {e.quando}
          </p>
        </div>
      </div>
      {e.html ? (
        <iframe title={`Prévia: ${e.assunto}`} srcDoc={e.html} sandbox="" className="email-previa" loading="lazy" />
      ) : null}
      <details className="cartao-corpo">
        <summary className="pequeno">Versão em texto puro</summary>
        <pre className="email-texto">{e.texto}</pre>
      </details>
    </article>
  );
}

/** Só em desenvolvimento: mostra os e-mails que seriam enviados (e, com ?modelos=1, os modelos com dados de exemplo). */
export default async function Emails({ searchParams }: PageProps<'/dev/emails'>) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { modelos } = await searchParams;
  const site = env().SITE_URL;
  let itens: Item[];
  if (modelos) {
    const ex = [
      emailCodigo({ nome: 'Maria', codigo: '387366', finalidade: 'primeiro_acesso', minutos: 10, siteUrl: site }),
      emailCodigo({ nome: 'Maria', codigo: '512904', finalidade: 'redefinir_senha', minutos: 10, siteUrl: site }),
      emailSenhaAlterada({ nome: 'Maria', quando: new Date(), siteUrl: site, area: 'portal' }),
      (() => {
        const texto =
          'Olá, Maria.\n\nVocê foi vinculado(a) à formação "Alfabetização nos anos iniciais".\nNo portal do servidor você acompanha sua frequência e, ao final, baixa o certificado.\n\nEntre no portal: ' +
          site +
          '/entrar';
        return {
          assunto: 'Programa Formar: você foi vinculado(a) a uma formação',
          texto,
          html: htmlDeTexto('Programa Formar: você foi vinculado(a) a uma formação', texto, site)
        };
      })()
    ];
    itens = ex.map((m, i) => ({
      id: String(i),
      assunto: m.assunto,
      para: 'exemplo@edu.serraclara.example',
      quando: 'modelo',
      texto: m.texto,
      html: m.html
    }));
  } else {
    const d = await db();
    const emails = await d.select().from(schema.emailSaida).orderBy(desc(schema.emailSaida.criadoEm)).limit(50);
    itens = emails.map(e => ({
      id: e.id,
      assunto: e.assunto,
      para: e.para,
      quando: dataHoraBR(e.criadoEm),
      texto: e.texto,
      html: e.html
    }));
  }
  return (
    <main id="conteudo" className="container container-estreito pagina">
      <div className="pilha g6">
        <p className="sobretitulo">Desenvolvimento</p>
        <h1 className="titulo-pagina">{modelos ? 'Modelos de e-mail' : 'Caixa de saída'}</h1>
        <p className="texto-3">
          {modelos
            ? 'Os modelos com dados de exemplo. '
            : 'E-mails que seriam enviados. Nada sai da máquina em desenvolvimento. '}
          <Link href={modelos ? '/dev/emails' : '/dev/emails?modelos=1'}>
            {modelos ? 'Ver a caixa de saída' : 'Ver os modelos'}
          </Link>
        </p>
      </div>
      {itens.length ? itens.map(e => <Mensagem key={e.id} e={e} />) : <p className="vazio">Nenhum e-mail ainda.</p>}
    </main>
  );
}
