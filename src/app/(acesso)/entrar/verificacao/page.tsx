import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cancelarAcessoServidor, verificarCodigoServidor } from '@/lib/acoes/portal-acesso';
import { servidorAtual, servidorParcial } from '@/lib/auth/sessao';
import { VerificarCodigo } from '@/components/DuasEtapas';
import { MoldeAcesso } from '../../MoldeAcesso';

export const metadata: Metadata = { title: 'Código do aplicativo' };

export default async function Page() {
  if (await servidorAtual()) redirect('/portal');
  const p = await servidorParcial();
  if (!p) redirect('/entrar');
  if (!p.cadastroConcluido) redirect('/primeiro-acesso/autenticador');
  return (
    <MoldeAcesso
      titulo="Confirme que é você"
      subtitulo="Digite o código de 6 números que aparece agora no seu aplicativo autenticador."
    >
      <VerificarCodigo verificar={verificarCodigoServidor} cancelar={cancelarAcessoServidor} />
    </MoldeAcesso>
  );
}
