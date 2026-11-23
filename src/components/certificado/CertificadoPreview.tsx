import type { Modulo } from '@/lib/dominio/regras';
import css from './certificado.module.css';

export type DadosCertificado = {
  nome: string;
  formacao: string;
  cargaTotal: number;
  cargaCumprida: number;
  cargaPresencial: number;
  cargaEstudo: number;
  presencialCumprida: number;
  estudoCumprida: number;
  cidade: string;
  dataExtenso: string;
  dataEmissaoBR: string;
  assinaturas: { nome: string; cargo: string }[];
  modulos: Modulo[];
  codigo: string;
  urlValidacao: string;
};

/**
 * Prévia em HTML do certificado (A4 paisagem). O PDF oficial é gerado no servidor
 * com o mesmo layout (src/lib/pdf/certificado.ts).
 */
export function CertificadoPreview({
  dados,
  lado,
  rotulo
}: {
  dados: DadosCertificado;
  lado: 'frente' | 'verso';
  rotulo?: string;
}) {
  const d = dados;
  return (
    <figure
      className={css.folha}
      aria-label={rotulo ?? (lado === 'frente' ? 'Frente do certificado' : 'Verso do certificado')}
    >
      <div className={css.moldura}>
        {lado === 'frente' ? (
          <div className={css.frente}>
            <p className={css.titulo}>CERTIFICADO</p>
            <p className={css.texto}>
              A Prefeitura de Serra Clara, por meio da Secretaria Municipal de Educação, certifica que
            </p>
            <p className={css.nome}>{d.nome}</p>
            <p className={css.texto}>
              participou da formação “{d.formacao}”, com carga horária total de {d.cargaTotal} horas, totalizando{' '}
              {d.cargaCumprida} horas de participação.
            </p>
            <p className={css.texto}>
              {d.cidade}, {d.dataExtenso}.
            </p>
            <div className={css.rodape}>
              {d.assinaturas.map(a => (
                <div key={a.nome} className={css.assinatura}>
                  <span>{a.nome}</span>
                  <span>{a.cargo}</span>
                </div>
              ))}
              <img src="/marca/logo-orgao.png" alt="" className={css.logo} width={120} height={50} />
            </div>
          </div>
        ) : (
          <div className={css.verso}>
            <p className={css.subtitulo}>CONTEÚDO PROGRAMÁTICO</p>
            <p className={css.curso}>{d.formacao}</p>
            <ol className={css.modulos}>
              {d.modulos.map((m, i) => (
                <li key={i}>
                  <strong>
                    {i + 1}. {m.titulo}
                  </strong>
                  {m.itens.length ? (
                    <ul>
                      {m.itens.map((it, j) => (
                        <li key={j}>{it}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ol>
            <div className={css.cargas}>
              <p>
                Carga horária total do curso: {d.cargaTotal} horas ({d.cargaPresencial}h presenciais
                {d.cargaEstudo ? ` + ${d.cargaEstudo}h de estudos complementares` : ''})
              </p>
              <p>
                Carga horária executada: {d.presencialCumprida}h presenciais
                {d.cargaEstudo ? ` + ${d.estudoCumprida}h de estudos complementares` : ''}
              </p>
              <p>
                <strong>Carga horária total executada: {d.cargaCumprida} horas</strong>
              </p>
              <p className={css.codigo}>
                Emitido eletronicamente em {d.dataEmissaoBR} · Código de validação <strong>{d.codigo}</strong> ·{' '}
                {d.urlValidacao}
              </p>
            </div>
          </div>
        )}
      </div>
    </figure>
  );
}
