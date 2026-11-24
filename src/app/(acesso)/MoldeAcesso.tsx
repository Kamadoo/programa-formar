import type { ReactNode } from 'react';
import Link from 'next/link';
import { MarcaFormar } from '@/components/MarcaFormar';
import { TemaAlternar } from '@/components/TemaAlternar';
import css from './acesso.module.css';

/**
 * Layout das telas de acesso: painel da marca à esquerda (some no celular) e o formulário à direita,
 * com os links secundários e os avisos legais no rodapé da coluna.
 */
export function MoldeAcesso({
  children,
  titulo,
  subtitulo,
  etapa,
  rodape,
  gestao = false
}: {
  children: ReactNode;
  titulo: string;
  subtitulo?: ReactNode;
  /** Ex.: "Passo 2 de 4" — aparece acima do título. */
  etapa?: string;
  /** Links secundários (validar certificado, acesso da gestão…). */
  rodape?: ReactNode;
  gestao?: boolean;
}) {
  return (
    <>
      <div className="faixa-marca" />
      <main id="conteudo" className={css.tela}>
        <section className={css.marca} aria-label="Sobre o Programa Formar">
          <MarcaFormar variante="empilhada" altura={84} className={css.logoGrande} />
          <div className={css.marcaTexto}>
            <span className={css.selo}>{gestao ? 'Gestão de formações' : 'Portal do servidor'}</span>
            <p className={css.chamada}>
              {gestao ? (
                <>
                  Formações, presença e <em>certificados</em> sem papelada.
                </>
              ) : (
                <>
                  Suas <em>formações</em> e certificados, num só lugar.
                </>
              )}
            </p>
            <p className={css.descricao}>
              {gestao
                ? 'Área do núcleo de formação da Secretaria Municipal de Educação.'
                : 'Acompanhe a frequência, baixe seus certificados e confira a autenticidade de cada um.'}
            </p>
          </div>
          <div className={css.assinaturaMarca}>
            <img
              src="/marca/logo-orgao.png"
              alt="Prefeitura de Serra Clara"
              className={`logo ${css.logoPrefeitura}`}
              width={86}
              height={36}
            />
            <p className="pequeno texto-3">Secretaria Municipal de Educação de Serra Clara</p>
          </div>
        </section>

        <section className={css.form}>
          <div className={css.topoCaixa}>
            <span className={css.logoMovel}>
              <MarcaFormar altura={22} />
            </span>
            <span />
            <TemaAlternar />
          </div>

          <div className={css.caixa}>
            <header className={css.cabecalho}>
              {etapa ? <p className={css.etapa}>{etapa}</p> : null}
              <h1 className={css.titulo}>{titulo}</h1>
              {subtitulo ? <p className={css.subtitulo}>{subtitulo}</p> : null}
            </header>
            {children}
          </div>

          <footer className={css.rodape}>
            {rodape ? (
              <nav className={css.rodapeLinks} aria-label="Outros acessos">
                {rodape}
              </nav>
            ) : null}
            <p className={css.legal}>
              Ao usar o sistema, você concorda com os <Link href="/termos">Termos de uso</Link> e o{' '}
              <Link href="/privacidade">Aviso de privacidade</Link>.
            </p>
          </footer>
        </section>
      </main>
    </>
  );
}
