import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  ativarAutenticadorServidor,
  cancelarAcessoServidor,
  concluirAutenticadorServidor
} from '@/lib/acoes/portal-acesso';
import { segundaEtapaOkNestaSessao, servidorAtual, servidorParcial } from '@/lib/auth/sessao';
import { prepararConfiguracaoServidor } from '@/lib/auth/configuracao-2fa';
import { AtivarVerificacao } from '@/components/DuasEtapas';
import { MoldeAcesso } from '../../MoldeAcesso';

export const metadata: Metadata = { title: 'Aplicativo autenticador' };

const acoes = {
  ativar: ativarAutenticadorServidor,
  concluir: concluirAutenticadorServidor,
  cancelar: cancelarAcessoServidor,
  rotuloConcluir: 'Já guardei, criar minha senha',
  avisoRecarregado: 'Aplicativo ativado. Se não guardou os códigos de recuperação, gere novos depois em Minha conta.'
};

export default async function Page() {
  if (await servidorAtual()) redirect('/portal');
  const p = await servidorParcial();
  if (!p || !p.usuario) redirect('/primeiro-acesso');
  if (p.cadastroConcluido) redirect('/entrar/verificacao');

  const titulo = 'Cadastre o aplicativo autenticador';
  const etapa = 'Passo 2 de 4 · Proteger a conta';
  if (p.totpAtivo) {
    // Acabou de ativar (ou recarregou a página): mostra os códigos de recuperação/continuação.
    if (!(await segundaEtapaOkNestaSessao('servidor'))) redirect('/primeiro-acesso');
    return (
      <MoldeAcesso etapa={etapa} titulo={titulo}>
        <AtivarVerificacao qrDataUri="" segredo="" {...acoes} />
      </MoldeAcesso>
    );
  }
  const cfg = await prepararConfiguracaoServidor(p.id, p.usuario);
  return (
    <MoldeAcesso
      etapa={etapa}
      titulo={titulo}
      subtitulo="Além da senha, você vai usar um código do celular a cada acesso. Assim, ninguém entra na sua conta só com a senha."
    >
      <AtivarVerificacao qrDataUri={cfg.qrDataUri} segredo={cfg.segredoFormatado} {...acoes} />
    </MoldeAcesso>
  );
}
