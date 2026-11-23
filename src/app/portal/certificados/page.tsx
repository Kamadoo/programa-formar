import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, Eye } from 'lucide-react';
import { CertificadoPreview } from '@/components/certificado/CertificadoPreview';
import { exigirServidor } from '@/lib/auth/sessao';
import { dadosCertificado } from '@/lib/dominio/certificado-dados';
import { certificadoLiberado, dataBR } from '@/lib/dominio/regras';
import { formacoesDoServidor } from '@/lib/dominio/servico';
import css from './certificados.module.css';

export const metadata: Metadata = { title: 'Meus certificados' };

export default async function MeusCertificados() {
  const s = await exigirServidor();
  const lista = (await formacoesDoServidor(s.id)).filter(x => certificadoLiberado(x.eu.status) && x.eu.certificado);
  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">Certificados</p>
          <h1 className="titulo-pagina">Meus certificados</h1>
          <p className="texto-3">Todos com frente, verso (conteúdo programático) e código de validação.</p>
        </div>
      </div>
      {lista.length ? (
        <ul className={`grade-cards ${css.grade}`}>
          {lista.map(({ det, eu }) => {
            const c = eu.certificado!;
            return (
              <li key={c.id} className={`cartao ${css.card}`}>
                <Link href={`/portal/certificados/${c.id}`} className={css.miniatura} tabIndex={-1} aria-hidden="true">
                  <CertificadoPreview dados={dadosCertificado(det, eu)} lado="frente" />
                </Link>
                <div className={css.corpo}>
                  <h2 className={css.titulo}>{det.formacao.titulo}</h2>
                  <p className="pequeno texto-3">
                    {eu.cargaCumprida}h de {det.cargaTotal}h · emitido em {dataBR(c.dataEmissao)}
                  </p>
                  <p className="mono pequeno texto-2">{c.codigo}</p>
                  <div className={css.acoes}>
                    <Link
                      href={`/portal/certificados/${c.id}`}
                      className="botao botao-pequeno"
                      aria-label={`Visualizar certificado: ${det.formacao.titulo}`}
                    >
                      <Eye size={15} aria-hidden="true" /> Visualizar
                    </Link>
                    <a
                      href={`/portal/certificados/${c.id}/pdf`}
                      className="botao botao-primario botao-pequeno"
                      download
                      aria-label={`Baixar PDF: ${det.formacao.titulo}`}
                    >
                      <Download size={15} aria-hidden="true" /> Baixar PDF
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="vazio">Você ainda não tem certificados liberados.</p>
      )}
    </>
  );
}
