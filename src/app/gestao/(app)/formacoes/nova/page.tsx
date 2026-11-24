import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FormFormacao } from '../FormFormacao';
import { hojeISO } from '@/lib/dominio/datas';

export const metadata: Metadata = { title: 'Nova formação' };

export default function NovaFormacao() {
  return (
    <>
      <Link href="/gestao/formacoes" className="link-voltar">
        <ArrowLeft size={16} aria-hidden="true" /> Formações
      </Link>
      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">Nova formação</p>
          <h1 className="titulo-pagina">Cadastrar formação</h1>
          <p className="texto-3">Depois de criar, você adiciona os encontros e vincula os servidores.</p>
        </div>
      </div>
      <section className="cartao cartao-corpo">
        <FormFormacao ano={Number(hojeISO().slice(0, 4))} />
      </section>
    </>
  );
}
