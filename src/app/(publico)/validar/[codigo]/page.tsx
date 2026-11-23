import type { Metadata } from 'next';
import Link from 'next/link';
import { CircleX, ShieldAlert, ShieldCheck } from 'lucide-react';
import { auditar } from '@/lib/auditoria';
import { dataBR, normalizarCodigo } from '@/lib/dominio/regras';
import { validarCodigoPublico } from '@/lib/dominio/servico';
import { hojeISO } from '@/lib/dominio/datas';

export const metadata: Metadata = { title: 'Resultado da validação' };

export default async function ResultadoValidacao({ params }: PageProps<'/validar/[codigo]'>) {
  const { codigo: bruto } = await params;
  const codigo = normalizarCodigo(decodeURIComponent(bruto));
  const r = codigo.length >= 10 ? await validarCodigoPublico(codigo) : null;
  await auditar({
    atorTipo: 'publico',
    acao: r ? 'validar_ok' : 'validar_inexistente',
    entidade: 'certificado',
    detalhes: { codigo }
  });

  return (
    <section className="validar">
      {!r ? (
        <div className="cartao cartao-corpo pilha g14 resultado">
          <CircleX size={36} aria-hidden="true" className="icone-erro" />
          <h1 className="titulo-pagina">Certificado não encontrado</h1>
          <p className="texto-2">
            Não existe certificado com o código <strong className="mono">{codigo || '—'}</strong>. Confira se digitou
            exatamente como está no verso do documento.
          </p>
        </div>
      ) : r.revogadoEm ? (
        <div className="cartao cartao-corpo pilha g14 resultado">
          <ShieldAlert size={36} aria-hidden="true" className="icone-alerta" />
          <h1 className="titulo-pagina">Certificado cancelado</h1>
          <p className="texto-2">
            O código <strong className="mono">{r.codigo}</strong> existiu, mas o certificado foi cancelado em{' '}
            {dataBR(hojeISO(r.revogadoEm))} (por exemplo, após uma correção de presença). Ele não tem mais validade.
          </p>
        </div>
      ) : (
        <div className="cartao cartao-corpo pilha g18 resultado">
          <ShieldCheck size={36} aria-hidden="true" className="icone-ok" />
          <div className="pilha g6">
            <p className="sobretitulo">Certificado autêntico</p>
            <h1 className="titulo-pagina">{r.nome}</h1>
          </div>
          <dl className="lista-dados">
            <div className="largo">
              <dt>Formação</dt>
              <dd>{r.formacao}</dd>
            </div>
            <div>
              <dt>Carga horária</dt>
              <dd>
                {r.horas}h de {r.cargaTotal}h
              </dd>
            </div>
            <div>
              <dt>Período</dt>
              <dd>{r.periodo}</dd>
            </div>
            <div>
              <dt>Emissão</dt>
              <dd>{dataBR(r.dataEmissao)}</dd>
            </div>
            <div>
              <dt>Código</dt>
              <dd className="mono">{r.codigo}</dd>
            </div>
          </dl>
          <p className="pequeno texto-3">
            Emitido pela Secretaria Municipal de Educação de Serra Clara — Programa Formar.
          </p>
        </div>
      )}
      <Link href="/validar" className="botao">
        Validar outro código
      </Link>
    </section>
  );
}
