import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { MoldeAcesso } from '../MoldeAcesso';
import { FormEsqueciUsuario } from './FormEsqueciUsuario';

export const metadata: Metadata = { title: 'Esqueci o usuário' };

export default function Page() {
  return (
    <MoldeAcesso
      titulo="Recuperar o usuário"
      subtitulo="Informe seu CPF. Enviaremos seu usuário para o e-mail institucional."
      rodape={
        <Link href="/entrar">
          <ArrowLeft size={14} aria-hidden="true" /> Voltar para entrar
        </Link>
      }
    >
      <FormEsqueciUsuario />
    </MoldeAcesso>
  );
}
