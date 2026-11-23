import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { gestorAtual, gestorParcial } from '@/lib/auth/sessao';
import { MoldeAcesso } from '@/app/(acesso)/MoldeAcesso';
import { FormEntrarGestao } from './FormEntrarGestao';

export const metadata: Metadata = { title: 'Gestão · Entrar' };

export default async function Page() {
  if (await gestorAtual()) redirect('/gestao');
  if (await gestorParcial()) redirect('/gestao/verificacao');
  return (
    <MoldeAcesso
      gestao
      titulo="Entrar na gestão"
      subtitulo="Acesso restrito ao núcleo de formação da SEMED."
      rodape={
        <>
          <Link href="/entrar">
            <ArrowLeft size={14} aria-hidden="true" /> Sou servidor(a)
          </Link>
          <Link href="/validar">Validar um certificado</Link>
        </>
      }
    >
      <FormEntrarGestao />
    </MoldeAcesso>
  );
}
