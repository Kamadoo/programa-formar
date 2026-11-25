import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { MoldeAcesso } from '@/app/(acesso)/MoldeAcesso';
import { gestorAtual, gestorParcial, segundaEtapaOkNestaSessao } from '@/lib/auth/sessao';
import { prepararConfiguracao } from '@/lib/auth/configuracao-2fa';
import {
  ativarVerificacao,
  cancelarVerificacao,
  concluirAtivacao,
  verificarSegundaEtapa
} from '@/lib/acoes/verificacao';
import { AtivarVerificacao, VerificarCodigo } from '@/components/DuasEtapas';

const acoes = { ativar: ativarVerificacao, concluir: concluirAtivacao, cancelar: cancelarVerificacao };

export const metadata: Metadata = { title: 'Verificação em duas etapas' };

export default async function Verificacao() {
  if (await gestorAtual()) redirect('/gestao');
  const g = await gestorParcial();
  if (!g) redirect('/gestao/entrar');

  // Acabou de ativar nesta sessão: mantém o mesmo componente na tela para mostrar os códigos de recuperação.
  if (g.totpAtivo && (await segundaEtapaOkNestaSessao())) {
    return (
      <MoldeAcesso
        gestao
        titulo="Ative a verificação em duas etapas"
        subtitulo="Último passo: guarde os códigos de recuperação."
      >
        <AtivarVerificacao qrDataUri="" segredo="" {...acoes} />
      </MoldeAcesso>
    );
  }

  if (g.totpAtivo) {
    return (
      <MoldeAcesso
        gestao
        titulo="Verificação em duas etapas"
        subtitulo="Digite o código de 6 dígitos que aparece no seu aplicativo autenticador."
      >
        <VerificarCodigo verificar={verificarSegundaEtapa} cancelar={cancelarVerificacao} />
      </MoldeAcesso>
    );
  }

  const cfg = await prepararConfiguracao(g.id, g.usuario);
  return (
    <MoldeAcesso
      gestao
      titulo="Ative a verificação em duas etapas"
      subtitulo="Obrigatória para a gestão. Além da senha, você vai usar um código do celular a cada acesso."
    >
      <AtivarVerificacao qrDataUri={cfg.qrDataUri} segredo={cfg.segredoFormatado} {...acoes} />
    </MoldeAcesso>
  );
}
