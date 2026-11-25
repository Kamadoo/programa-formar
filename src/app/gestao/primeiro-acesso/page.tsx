import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { gestorAtual } from '@/lib/auth/sessao';
import { MoldeAcesso } from '@/app/(acesso)/MoldeAcesso';
import { FormPrimeiroAcesso } from '@/app/(acesso)/primeiro-acesso/FormPrimeiroAcesso';

export const metadata: Metadata = { title: 'Primeiro acesso · Gestão' };

export default async function Page() {
  if (await gestorAtual()) redirect('/gestao');
  return (
    <MoldeAcesso
      gestao
      etapa="Passo 1 de 4 · Confirmar e-mail"
      titulo="Ative seu acesso à gestão"
      subtitulo="Informe o CPF ou o CNPJ cadastrado na sua conta. Enviaremos um código para o seu e-mail. O documento serve só para esta ativação: depois você entra com seu usuário."
      rodape={
        <Link href="/gestao/entrar">
          <ArrowLeft size={14} aria-hidden="true" /> Já tenho acesso
        </Link>
      }
    >
      <FormPrimeiroAcesso gestao />
    </MoldeAcesso>
  );
}
