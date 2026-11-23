import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Search, ShieldCheck } from 'lucide-react';
import { normalizarCodigo } from '@/lib/dominio/regras';

export const metadata: Metadata = { title: 'Validar certificado' };

async function buscar(form: FormData) {
  'use server';
  const codigo = normalizarCodigo(String(form.get('codigo') ?? ''));
  if (codigo) redirect(`/validar/${encodeURIComponent(codigo)}`);
  redirect('/validar?vazio=1');
}

export default async function Validar({ searchParams }: PageProps<'/validar'>) {
  const { vazio } = await searchParams;
  return (
    <section className="validar">
      <div className="pilha g10 centro-texto">
        <ShieldCheck size={36} aria-hidden="true" className="icone-destaque" />
        <h1 className="titulo-pagina">Validar certificado</h1>
        <p className="texto-3">Digite o código impresso no verso do certificado para conferir se ele é autêntico.</p>
      </div>
      <form action={buscar} className="cartao cartao-corpo pilha g14" role="search">
        <div className="campo">
          <label htmlFor="codigo">Código de validação</label>
          <div className="com-icone">
            <Search size={18} aria-hidden="true" />
            <input
              id="codigo"
              name="codigo"
              className="entrada mono"
              placeholder="PNL-2026-XXXX-0000-XXXXX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={48}
              required
              aria-invalid={Boolean(vazio)}
              aria-describedby={vazio ? 'codigo-erro' : undefined}
            />
          </div>
          {vazio ? (
            <span id="codigo-erro" className="erro-campo">
              Informe o código.
            </span>
          ) : null}
        </div>
        <button type="submit" className="botao botao-primario botao-alto">
          Validar
        </button>
      </form>
    </section>
  );
}
