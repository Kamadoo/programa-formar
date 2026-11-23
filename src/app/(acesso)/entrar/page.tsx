import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CircleCheck } from 'lucide-react';
import { servidorAtual, servidorParcial } from '@/lib/auth/sessao';
import { MoldeAcesso } from '../MoldeAcesso';
import { FormEntrar } from './FormEntrar';

export const metadata: Metadata = { title: 'Entrar' };

export default async function Page({ searchParams }: PageProps<'/entrar'>) {
  if (await servidorAtual()) redirect('/portal');
  const p = await servidorParcial();
  if (p?.cadastroConcluido) redirect('/entrar/verificacao');
  const { senha } = await searchParams;
  return (
    <MoldeAcesso
      titulo="Entrar no portal"
      subtitulo="Portal do servidor da rede municipal de Serra Clara."
      rodape={
        <>
          <Link href="/validar">Validar um certificado</Link>
          <Link href="/gestao/entrar">Acesso da gestão</Link>
        </>
      }
    >
      {senha === 'ok' ? (
        <p className="aviso aviso-ok" role="status">
          <CircleCheck size={18} aria-hidden="true" /> Senha alterada. Agora é só entrar.
        </p>
      ) : null}
      <FormEntrar />
    </MoldeAcesso>
  );
}
