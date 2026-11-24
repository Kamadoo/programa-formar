import { horasTexto, type Modulo } from '@/lib/dominio/regras';
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
 * Prévia em HTML do certificado (A4 paisagem), no modelo oficial: a arte de fundo traz moldura, título,
 * assinaturas eletrônicas e marca; os textos ficam nas mesmas posições do PDF (src/lib/pdf/certificado.ts).
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
  // Grade do modelo: 1–3 à esquerda, 4–6 à direita; mais de 6 divide ao meio.
  const porColuna = d.modulos.length <= 6 ? 3 : Math.ceil(d.modulos.length / 2);
  const colunas = [d.modulos.slice(0, porColuna), d.modulos.slice(porColuna)];
  return (
    <figure
      className={css.folha}
      aria-label={rotulo ?? (lado === 'frente' ? 'Frente do certificado' : 'Verso do certificado')}
    >
      <img src={`/certificado-fundo/${lado}`} alt="" className={css.fundo} width={1400} height={990} />
      {lado === 'frente' ? (
        <>
          <p className={`${css.t} ${css.intro}`}>
            A Prefeitura de Serra Clara, por meio da Secretaria Municipal de Educação, certifica que
          </p>
          <p className={`${css.t} ${css.nome}`}>{d.nome}</p>
          <span className={css.linhaNome} aria-hidden="true" />
          <p className={`${css.t} ${css.corpo}`}>
            participou do treinamento “{d.formacao}”, realizado pela Secretaria Municipal de Educação, totalizando{' '}
            {horasTexto(d.cargaCumprida)} horas de participação.
          </p>
          <p className={`${css.t} ${css.data}`}>
            {d.cidade}, {d.dataExtenso}.
          </p>
        </>
      ) : (
        <>
          <p className={`${css.t} ${css.subtitulo}`}>CONTEÚDO PROGRAMÁTICO</p>
          <p className={`${css.t} ${css.curso}`}>{d.formacao}</p>
          <div className={css.modulos}>
            {colunas.map((col, c) => (
              <ol key={c} className={css.coluna} start={c * porColuna + 1}>
                {col.map((m, i) => (
                  <li key={i} className={porColuna > 3 ? css.moduloCompacto : css.modulo}>
                    <strong>
                      {c * porColuna + i + 1}. {m.titulo}
                      {m.cargaH ? ` — ${horasTexto(m.cargaH)}h` : ''}
                    </strong>
                    {m.itens.length ? (
                      <ul>
                        {m.itens.map((it, j) => (
                          <li key={j}>
                            {it}
                            {m.cargasItens?.[j] ? ` (${horasTexto(m.cargasItens[j])}h)` : ''}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ol>
            ))}
          </div>
          <p className={`${css.t} ${css.executada}`}>
            Carga horária total executada: {horasTexto(d.cargaCumprida)} horas
          </p>
          <p className={`${css.t} ${css.emissao}`}>
            Emitido eletronicamente em {d.dataEmissaoBR} · Código de validação: {d.codigo}
          </p>
        </>
      )}
    </figure>
  );
}
