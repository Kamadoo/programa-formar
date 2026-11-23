import type { Metadata } from 'next';
import { ShieldAlert } from 'lucide-react';
import { trocarSenhaServidor } from '@/lib/acoes/conta';
import { novosCodigosRecuperacaoServidor } from '@/lib/acoes/portal-acesso';
import { exigirServidor } from '@/lib/auth/sessao';
import { FormTrocarSenha } from '@/components/FormTrocarSenha';
import { NovosCodigos } from '@/app/gestao/(app)/conta/NovosCodigos';

export const metadata: Metadata = { title: 'Minha conta' };

export default async function Conta({ searchParams }: PageProps<'/portal/conta'>) {
  const s = await exigirServidor();
  const { recuperacao } = await searchParams;
  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">Minha conta</p>
          <h1 className="titulo-pagina">{s.nome}</h1>
          <p className="texto-3">
            {s.usuario ? (
              <>
                Usuário <strong className="mono">{s.usuario}</strong>
              </>
            ) : (
              `Matrícula ${s.matricula}`
            )}
            {s.lotacao ? ` · ${s.lotacao}` : ''}
          </p>
        </div>
      </div>
      {recuperacao ? (
        <p className="aviso aviso-alerta" role="status">
          <ShieldAlert size={18} aria-hidden="true" /> Você entrou com um código de recuperação. Se trocou de celular,
          gere novos códigos abaixo e guarde-os.
        </p>
      ) : null}
      <section className="cartao cartao-corpo pilha g14 largura-form" aria-labelledby="t-senha">
        <h2 id="t-senha" className="titulo-secao">
          Trocar senha
        </h2>
        <p className="pequeno texto-3">Trocar a senha encerra as sessões abertas em outros aparelhos.</p>
        <FormTrocarSenha acao={trocarSenhaServidor} usuario={s.usuario ?? s.matricula} />
      </section>
      <section className="cartao cartao-corpo pilha g14 largura-form" aria-labelledby="t-codigos">
        <h2 id="t-codigos" className="titulo-secao">
          Códigos de recuperação
        </h2>
        <p className="pequeno texto-3">
          Servem para entrar se você perder o celular com o aplicativo autenticador. Gerar novos invalida os anteriores.
        </p>
        <NovosCodigos acao={novosCodigosRecuperacaoServidor} />
      </section>
      <p className="pequeno texto-3">
        Seus dados (nome, matrícula, e-mail e lotação) vêm da base da Secretaria de Educação. Para corrigir, fale com o
        núcleo de formação.
      </p>
    </>
  );
}
