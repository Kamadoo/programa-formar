import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { gestorAtual } from '@/lib/auth/sessao';
import { MoldeAcesso } from '@/app/(acesso)/MoldeAcesso';
import css from '@/app/(acesso)/acesso.module.css';

export const metadata: Metadata = { title: 'Acesso ativado · Gestão' };

export default async function Page() {
  const g = await gestorAtual();
  if (!g) redirect('/gestao/entrar');
  return (
    <MoldeAcesso
      gestao
      etapa="Passo 4 de 4 · Pronto"
      titulo="Acesso ativado"
      subtitulo="Anote seu usuário: é com ele que você vai entrar daqui para a frente."
    >
      <div className={css.usuarioGerado} role="status">
        <CircleCheck size={20} aria-hidden="true" />
        <div>
          <p className="pequeno texto-3">Seu usuário</p>
          <p className={`mono ${css.usuarioValor}`}>{g.usuario}</p>
        </div>
      </div>
      <ul className="pilha g6 pequeno texto-2">
        <li>Para entrar: usuário + senha + código do aplicativo autenticador.</li>
        <li>O usuário também aparece em Minha conta.</li>
      </ul>
      <Link href="/gestao" className="botao botao-primario botao-largo botao-alto">
        Ir para a gestão <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </MoldeAcesso>
  );
}
