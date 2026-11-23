import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { MoldeAcesso } from '../MoldeAcesso';
import { FormEsqueciSenha } from './FormEsqueciSenha';

export const metadata: Metadata = { title: 'Esqueci a senha' };

export default function Page() {
  return (
    <MoldeAcesso
      titulo="Criar nova senha"
      subtitulo="Informe seu usuário. Enviaremos um código para o seu e-mail institucional."
      rodape={
        <>
          <Link href="/entrar">
            <ArrowLeft size={14} aria-hidden="true" /> Voltar para entrar
          </Link>
          <Link href="/esqueci-usuario">Esqueci o usuário</Link>
        </>
      }
    >
      <FormEsqueciSenha />
    </MoldeAcesso>
  );
}
