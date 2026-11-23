import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, ShieldCheck } from 'lucide-react';
import { CertificadoPreview } from '@/components/certificado/CertificadoPreview';
import { exigirServidor } from '@/lib/auth/sessao';
import { dadosCertificado } from '@/lib/dominio/certificado-dados';
import { dataBR } from '@/lib/dominio/regras';
import { certificadoDoServidor, obterFormacao } from '@/lib/dominio/servico';
import css from '../certificados.module.css';

export const metadata: Metadata = { title: 'Certificado' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Certificado({ params, searchParams }: PageProps<'/portal/certificados/[id]'>) {
  const s = await exigirServidor();
  const { id } = await params;
  const { lado: l } = await searchParams;
  const lado = l === 'verso' ? 'verso' : 'frente';
  if (!UUID.test(id)) notFound();
  // Só encontra se o certificado for do próprio servidor.
  const r = await certificadoDoServidor(id, s.id);
  if (!r) notFound();
  const det = await obterFormacao(r.p.formacaoId);
  const eu = det?.participantes.find(p => p.participacaoId === r.p.id);
  if (!det || !eu) notFound();
  const dados = dadosCertificado(det, eu);

  return (
    <>
      <Link href="/portal/certificados" className="link-voltar">
        <ArrowLeft size={16} aria-hidden="true" /> Meus certificados
      </Link>
      <div className={css.detalhe}>
        <section className={`cartao ${css.lado}`} aria-label="Visualização do certificado">
          <nav className="segmentado" aria-label="Lado do certificado">
            <Link href="?lado=frente" scroll={false} replace aria-current={lado === 'frente' ? 'true' : undefined}>
              Frente
            </Link>
            <Link href="?lado=verso" scroll={false} replace aria-current={lado === 'verso' ? 'true' : undefined}>
              Verso · conteúdo
            </Link>
          </nav>
          <CertificadoPreview dados={dados} lado={lado} />
        </section>
        <aside className={`cartao ${css.info}`}>
          <span className="chip chip-ok">
            <ShieldCheck size={14} aria-hidden="true" /> Certificado disponível
          </span>
          <h1>{det.formacao.titulo}</h1>
          <dl className="lista-dados borda-topo pt14">
            <div>
              <dt>Carga cumprida</dt>
              <dd>
                {r.c.cargaCumpridaH}h de {det.cargaTotal}h
              </dd>
            </div>
            <div>
              <dt>Frequência</dt>
              <dd>{r.c.frequenciaPct}%</dd>
            </div>
            <div>
              <dt>Período</dt>
              <dd>{det.periodo}</dd>
            </div>
            <div>
              <dt>Emissão</dt>
              <dd>{dataBR(r.c.dataEmissao)}</dd>
            </div>
            <div className="largo">
              <dt>Formador(a)</dt>
              <dd>{det.formacao.formador}</dd>
            </div>
            <div className="largo">
              <dt>Código de validação</dt>
              <dd className="mono">{r.c.codigoValidacao}</dd>
            </div>
          </dl>
          <a href={`/portal/certificados/${id}/pdf`} className="botao botao-primario botao-largo botao-alto" download>
            <Download size={18} aria-hidden="true" /> Baixar PDF (frente e verso)
          </a>
          <p className="pequeno texto-3">
            Qualquer pessoa pode conferir a autenticidade em{' '}
            <Link href={`/validar/${r.c.codigoValidacao}`}>Validar certificado</Link>.
          </p>
        </aside>
      </div>
    </>
  );
}
