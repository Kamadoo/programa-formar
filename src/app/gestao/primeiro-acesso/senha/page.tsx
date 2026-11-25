import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { definirSenhaPrimeiroAcessoGestor } from '@/lib/acoes/gestao-acesso';
import { gestorAtual, gestorParcial, segundaEtapaOkNestaSessao } from '@/lib/auth/sessao';
import { MoldeAcesso } from '@/app/(acesso)/MoldeAcesso';
import { FormNovaSenha } from '@/app/(acesso)/FormNovaSenha';

export const metadata: Metadata = { title: 'Crie sua senha · Gestão' };

export default async function Page() {
  if (await gestorAtual()) redirect('/gestao');
  const g = await gestorParcial();
  if (!g) redirect('/gestao/primeiro-acesso');
  if (g.cadastroConcluido) redirect('/gestao/verificacao');
  if (!g.totpAtivo || !(await segundaEtapaOkNestaSessao('gestor'))) redirect('/gestao/primeiro-acesso/autenticador');
  return (
    <MoldeAcesso
      gestao
      etapa="Passo 3 de 4 · Senha"
      titulo="Crie sua senha"
      subtitulo="Você vai usar esta senha junto com o código do aplicativo para entrar na gestão."
    >
      <FormNovaSenha acao={definirSenhaPrimeiroAcessoGestor} />
    </MoldeAcesso>
  );
}
