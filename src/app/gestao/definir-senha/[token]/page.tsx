import type { Metadata } from 'next';
import { MoldeAcesso } from '@/app/(acesso)/MoldeAcesso';
import { validarTokenGestor } from '@/lib/auth/tokens';
import { primeiroNome } from '@/lib/dominio/regras';
import { FormSenhaGestor } from './FormSenhaGestor';

export const metadata: Metadata = { title: 'Definir senha · Gestão' };

export default async function Page({ params }: PageProps<'/gestao/definir-senha/[token]'>) {
  const { token } = await params;
  const t = await validarTokenGestor(token);
  if (!t) {
    return (
      <MoldeAcesso
        gestao
        titulo="Link expirado"
        subtitulo="Este link já foi usado ou passou do prazo. Peça um novo ao administrador do sistema."
      >
        <span />
      </MoldeAcesso>
    );
  }
  return (
    <MoldeAcesso
      gestao
      titulo={`Olá, ${primeiroNome(t.nome)}`}
      subtitulo="Crie sua senha da gestão. Em seguida você ativa a verificação em duas etapas."
    >
      <FormSenhaGestor token={token} email={t.email} />
    </MoldeAcesso>
  );
}
