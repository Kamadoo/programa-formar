import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NavAbas } from '@/components/NavAbas';
import { ChipFormacao } from '@/components/Status';
import { carregarFormacao } from './dados';
import css from './formacao.module.css';

export default async function LayoutFormacao({ children, params }: LayoutProps<'/gestao/formacoes/[id]'>) {
  const { id } = await params;
  const d = await carregarFormacao(id);
  const f = d.formacao;
  const base = `/gestao/formacoes/${id}`;
  const conferencia = d.participantes.filter(p => p.status === 'em_conferencia').length;
  return (
    <>
      <Link href="/gestao/formacoes" className="link-voltar">
        <ArrowLeft size={16} aria-hidden="true" /> Formações
      </Link>
      <header className={css.cabeca}>
        <div className="pilha g6">
          <p className="sobretitulo">{f.programaEixo}</p>
          <h1 className={css.titulo}>{f.titulo}</h1>
          <p className="texto-3 pequeno">
            {f.formador} · {d.cargaTotal}h ({f.cargaPresencialH}h presenciais
            {f.cargaEstudoH ? ` + ${f.cargaEstudoH}h de estudo` : ''}) · {d.periodo} · {f.local}
          </p>
        </div>
        <ChipFormacao status={f.status} />
      </header>
      <div className={css.subabas}>
        <NavAbas
          rotulo="Seções da formação"
          abas={[
            { href: base, rotulo: 'Dados da formação', exato: true },
            { href: `${base}/participantes`, rotulo: 'Participantes', contador: d.participantes.length },
            { href: `${base}/presenca`, rotulo: 'Presença' },
            { href: `${base}/certificados`, rotulo: 'Certificados', contador: conferencia, alerta: true }
          ]}
        />
      </div>
      {children}
    </>
  );
}
