import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { servidorAtual } from '@/lib/auth/sessao';
import { MoldeAcesso } from '../MoldeAcesso';
import { FormPrimeiroAcesso } from './FormPrimeiroAcesso';

export const metadata: Metadata = { title: 'Primeiro acesso' };

export default async function Page() {
  if (await servidorAtual()) redirect('/portal');
  return (
    <MoldeAcesso
      etapa="Passo 1 de 4 · Confirmar e-mail"
      titulo="Ative seu acesso"
      subtitulo="Informe seu CPF. Enviaremos um código para o seu e-mail institucional. O CPF serve só para esta ativação: depois você entra com seu usuário."
      rodape={
        <Link href="/entrar">
          <ArrowLeft size={14} aria-hidden="true" /> Já tenho acesso
        </Link>
      }
    >
      <FormPrimeiroAcesso />
    </MoldeAcesso>
  );
}
