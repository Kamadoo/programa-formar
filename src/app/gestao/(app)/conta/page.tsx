import type { Metadata } from 'next';
import { eq, isNull, and, sql } from 'drizzle-orm';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { db, schema } from '@/db';
import { trocarSenhaGestor } from '@/lib/acoes/conta';
import { exigirGestor } from '@/lib/auth/sessao';
import { dataHoraBR } from '@/lib/dominio/datas';
import { FormTrocarSenha } from '@/components/FormTrocarSenha';
import { NovosCodigos } from './NovosCodigos';

export const metadata: Metadata = { title: 'Minha conta' };

export default async function Conta({ searchParams }: PageProps<'/gestao/conta'>) {
  const g = await exigirGestor();
  const { recuperacao } = await searchParams;
  const d = await db();
  const [info] = await d.select().from(schema.gestor).where(eq(schema.gestor.id, g.id)).limit(1);
  const [{ restantes }] = await d
    .select({ restantes: sql<number>`count(*)::int` })
    .from(schema.codigoRecuperacao)
    .where(and(eq(schema.codigoRecuperacao.gestorId, g.id), isNull(schema.codigoRecuperacao.usadoEm)));

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">Minha conta</p>
          <h1 className="titulo-pagina">{g.nome}</h1>
          <p className="texto-3">
            {g.email} · {g.perfil === 'admin' ? 'Administrador' : 'Núcleo de formação'}
          </p>
        </div>
      </div>
      {recuperacao ? (
        <p className="aviso aviso-alerta" role="status">
          <ShieldAlert size={18} aria-hidden="true" /> Você entrou com um código de recuperação. Restam {restantes}. Se
          trocou de celular, peça ao administrador para redefinir a verificação em duas etapas.
        </p>
      ) : null}
      <div className="grade-cards">
        <section className="cartao cartao-corpo pilha g14" aria-labelledby="t-senha">
          <h2 id="t-senha" className="titulo-secao">
            Senha
          </h2>
          <p className="pequeno texto-3">
            {info.senhaAlteradaEm ? `Alterada em ${dataHoraBR(info.senhaAlteradaEm)}.` : 'Nunca alterada.'} Trocar a
            senha encerra as sessões em outros aparelhos.
          </p>
          <FormTrocarSenha acao={trocarSenhaGestor} usuario={g.email} />
        </section>
        <section className="cartao cartao-corpo pilha g14" aria-labelledby="t-2fa">
          <h2 id="t-2fa" className="titulo-secao">
            Verificação em duas etapas
          </h2>
          <p className="aviso aviso-ok">
            <ShieldCheck size={18} aria-hidden="true" /> Ativa desde{' '}
            {info.totpAtivadoEm ? dataHoraBR(info.totpAtivadoEm) : '—'}.
          </p>
          <p className="pequeno texto-3">
            Códigos de recuperação disponíveis: <strong className="num">{restantes}</strong> de 10. Gere novos se
            estiverem acabando ou se a lista pode ter sido vista por outra pessoa.
          </p>
          <NovosCodigos />
        </section>
      </div>
    </>
  );
}
