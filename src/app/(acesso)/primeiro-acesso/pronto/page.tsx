import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { servidorAtual } from '@/lib/auth/sessao';
import { MoldeAcesso } from '../../MoldeAcesso';
import css from '../../acesso.module.css';

export const metadata: Metadata = { title: 'Acesso ativado' };

export default async function Page() {
  const s = await servidorAtual();
  if (!s) redirect('/entrar');
  return (
    <MoldeAcesso
      etapa="Passo 4 de 4 · Pronto"
      titulo="Acesso ativado"
      subtitulo="Anote seu usuário: é com ele que você vai entrar daqui para a frente."
    >
      <div className={css.usuarioGerado} role="status">
        <CircleCheck size={20} aria-hidden="true" />
        <div>
          <p className="pequeno texto-3">Seu usuário</p>
          <p className={`mono ${css.usuarioValor}`}>{s.usuario}</p>
        </div>
      </div>
      <ul className="pilha g6 pequeno texto-2">
        <li>Para entrar: usuário + senha + código do aplicativo autenticador.</li>
        <li>
          Esqueceu o usuário? Use &ldquo;Esqueci o usuário&rdquo; na tela de entrada — enviamos para o seu e-mail.
        </li>
      </ul>
      <Link href="/portal" className="botao botao-primario botao-largo botao-alto">
        Ir para o portal <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </MoldeAcesso>
  );
}
