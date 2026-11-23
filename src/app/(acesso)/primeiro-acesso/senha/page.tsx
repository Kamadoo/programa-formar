import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { definirSenhaPrimeiroAcesso } from '@/lib/acoes/portal-acesso';
import { segundaEtapaOkNestaSessao, servidorAtual, servidorParcial } from '@/lib/auth/sessao';
import { MoldeAcesso } from '../../MoldeAcesso';
import { FormNovaSenha } from '../../FormNovaSenha';

export const metadata: Metadata = { title: 'Crie sua senha' };

export default async function Page() {
  if (await servidorAtual()) redirect('/portal');
  const p = await servidorParcial();
  if (!p) redirect('/primeiro-acesso');
  if (p.cadastroConcluido) redirect('/entrar/verificacao');
  if (!p.totpAtivo || !(await segundaEtapaOkNestaSessao('servidor'))) redirect('/primeiro-acesso/autenticador');
  return (
    <MoldeAcesso
      etapa="Passo 3 de 4 · Senha"
      titulo="Crie sua senha"
      subtitulo="Você vai usar esta senha junto com o código do aplicativo para entrar."
    >
      <FormNovaSenha acao={definirSenhaPrimeiroAcesso} />
    </MoldeAcesso>
  );
}
