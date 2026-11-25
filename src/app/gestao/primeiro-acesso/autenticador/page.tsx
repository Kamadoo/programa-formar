import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  ativarAutenticadorPrimeiroAcesso,
  cancelarPrimeiroAcessoGestor,
  concluirAutenticadorPrimeiroAcesso
} from '@/lib/acoes/gestao-acesso';
import { gestorAtual, gestorParcial, segundaEtapaOkNestaSessao } from '@/lib/auth/sessao';
import { prepararConfiguracao } from '@/lib/auth/configuracao-2fa';
import { AtivarVerificacao } from '@/components/DuasEtapas';
import { MoldeAcesso } from '@/app/(acesso)/MoldeAcesso';

export const metadata: Metadata = { title: 'Aplicativo autenticador · Gestão' };

const acoes = {
  ativar: ativarAutenticadorPrimeiroAcesso,
  concluir: concluirAutenticadorPrimeiroAcesso,
  cancelar: cancelarPrimeiroAcessoGestor,
  rotuloConcluir: 'Já guardei, criar minha senha',
  avisoRecarregado: 'Aplicativo ativado. Se não guardou os códigos de recuperação, gere novos depois em Minha conta.'
};

export default async function Page() {
  if (await gestorAtual()) redirect('/gestao');
  const g = await gestorParcial();
  if (!g) redirect('/gestao/primeiro-acesso');
  if (g.cadastroConcluido) redirect('/gestao/verificacao');

  const titulo = 'Cadastre o aplicativo autenticador';
  const etapa = 'Passo 2 de 4 · Proteger a conta';
  if (g.totpAtivo) {
    // Acabou de ativar (ou recarregou a página): mostra os códigos de recuperação/continuação.
    if (!(await segundaEtapaOkNestaSessao('gestor'))) redirect('/gestao/primeiro-acesso');
    return (
      <MoldeAcesso gestao etapa={etapa} titulo={titulo}>
        <AtivarVerificacao qrDataUri="" segredo="" {...acoes} />
      </MoldeAcesso>
    );
  }
  const cfg = await prepararConfiguracao(g.id, g.usuario);
  return (
    <MoldeAcesso
      gestao
      etapa={etapa}
      titulo={titulo}
      subtitulo="Obrigatório na gestão. Além da senha, você vai usar um código do celular a cada acesso."
    >
      <AtivarVerificacao qrDataUri={cfg.qrDataUri} segredo={cfg.segredoFormatado} {...acoes} />
    </MoldeAcesso>
  );
}
