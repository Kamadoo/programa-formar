import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, CircleCheck } from 'lucide-react';
import { gestorAtual, gestorParcial } from '@/lib/auth/sessao';
import { MoldeAcesso } from '@/app/(acesso)/MoldeAcesso';
import { FormEntrarGestao } from './FormEntrarGestao';

export const metadata: Metadata = { title: 'Gestão · Entrar' };

export default async function Page({ searchParams }: PageProps<'/gestao/entrar'>) {
  if (await gestorAtual()) redirect('/gestao');
  if (await gestorParcial()) redirect('/gestao/verificacao');
  const { senha } = await searchParams;
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
          <Link href="/gestao/primeiro-acesso">Primeiro acesso</Link>
          <Link href="/validar">Validar um certificado</Link>
        </>
      }
    >
      {senha === 'ok' ? (
        <p className="aviso aviso-ok" role="status">
          <CircleCheck size={18} aria-hidden="true" /> Senha salva. Entre com seu usuário e a nova senha.
        </p>
      ) : null}
      <FormEntrarGestao />
    </MoldeAcesso>
  );
}
