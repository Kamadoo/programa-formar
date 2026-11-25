import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, eq, lt, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { sha256, tokenAleatorio } from '@/lib/cripto';
import { COOKIE_GESTOR, COOKIE_SERVIDOR } from './cookies';
import { proximoCorte } from './corte';

type Tipo = 'gestor' | 'servidor';
type Etapa = 'senha' | 'completa';
/** Tempo máximo entre a senha e a segunda etapa. */
const ETAPA_SENHA_MIN = 10;

const DURACAO_MAX_H: Record<Tipo, number> = { gestor: 10, servidor: 12 };
const INATIVIDADE_MIN = 120;

const nomeCookie = (tipo: Tipo) => (tipo === 'gestor' ? COOKIE_GESTOR : COOKIE_SERVIDOR);

/**
 * Cria a sessão e grava o cookie. Só pode ser chamada em Server Action ou Route Handler.
 * Sem `lembrar`, o cookie é de sessão do navegador (some ao fechá-lo) e vale o limite de inatividade.
 */
export async function iniciarSessao(tipo: Tipo, usuarioId: string, etapa: Etapa = 'completa', lembrar = false) {
  const token = tokenAleatorio();
  const agora = Date.now();
  const expira =
    etapa === 'senha'
      ? new Date(agora + ETAPA_SENHA_MIN * 60_000)
      : lembrar
        ? proximoCorte(agora)
        : new Date(agora + DURACAO_MAX_H[tipo] * 3600_000);
  const d = await db();
  await d.insert(schema.sessao).values({ tokenHash: sha256(token), tipo, usuarioId, etapa, lembrar, expiraEm: expira });
  // Limpeza oportunista de sessões vencidas.
  await d.delete(schema.sessao).where(lt(schema.sessao.expiraEm, new Date()));
  (await cookies()).set(nomeCookie(tipo), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // A etapa da senha e o "manter conectado" persistem; o resto termina ao fechar o navegador.
    ...(etapa === 'senha' || lembrar ? { expires: expira } : {})
  });
}

export async function encerrarSessao(tipo: Tipo) {
  const jar = await cookies();
  const token = jar.get(nomeCookie(tipo))?.value;
  if (token) {
    const d = await db();
    await d.delete(schema.sessao).where(eq(schema.sessao.tokenHash, sha256(token)));
  }
  // Apagar com os mesmos atributos da criação (o prefixo __Host- exige Secure e path=/).
  jar.set(nomeCookie(tipo), '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}

/** Encerra todas as sessões de um usuário (ex.: após trocar a senha). */
export async function encerrarTodasSessoes(tipo: Tipo, usuarioId: string) {
  const d = await db();
  await d.delete(schema.sessao).where(and(eq(schema.sessao.tipo, tipo), eq(schema.sessao.usuarioId, usuarioId)));
}

/**
 * Concluída a segunda etapa, troca a sessão parcial por uma completa com token NOVO
 * (o token visto antes da verificação deixa de valer).
 */
export async function concluirSegundaEtapa(usuarioId: string, tipo: Tipo = 'gestor') {
  const token = (await cookies()).get(nomeCookie(tipo))?.value;
  let lembrar = false;
  if (token) {
    const d = await db();
    const [r] = await d
      .select({ lembrar: schema.sessao.lembrar })
      .from(schema.sessao)
      .where(eq(schema.sessao.tokenHash, sha256(token)))
      .limit(1);
    lembrar = Boolean(r?.lembrar);
  }
  await encerrarSessao(tipo);
  await iniciarSessao(tipo, usuarioId, 'completa', lembrar);
}

/** Marca a sessão parcial atual como já verificada (o acesso só libera em concluirSegundaEtapa). */
export async function marcarSegundaEtapaOk(tipo: Tipo = 'gestor') {
  const token = (await cookies()).get(nomeCookie(tipo))?.value;
  if (!token) return;
  const d = await db();
  await d
    .update(schema.sessao)
    .set({ segundaEtapaOk: true })
    .where(and(eq(schema.sessao.tokenHash, sha256(token)), eq(schema.sessao.etapa, 'senha')));
}

export async function segundaEtapaOkNestaSessao(tipo: Tipo = 'gestor'): Promise<boolean> {
  const token = (await cookies()).get(nomeCookie(tipo))?.value;
  if (!token) return false;
  const d = await db();
  const [r] = await d
    .select({ ok: schema.sessao.segundaEtapaOk, expira: schema.sessao.expiraEm })
    .from(schema.sessao)
    .where(and(eq(schema.sessao.tokenHash, sha256(token)), eq(schema.sessao.etapa, 'senha')))
    .limit(1);
  return Boolean(r?.ok && r.expira.getTime() > Date.now());
}

async function lerSessao(tipo: Tipo, etapa: Etapa = 'completa'): Promise<string | null> {
  const token = (await cookies()).get(nomeCookie(tipo))?.value;
  if (!token || token.length > 100) return null;
  const d = await db();
  const hash = sha256(token);
  const [s] = await d.select().from(schema.sessao).where(eq(schema.sessao.tokenHash, hash)).limit(1);
  if (!s || s.tipo !== tipo || s.etapa !== etapa) return null;
  const agora = Date.now();
  const inativa = !s.lembrar && agora - s.ultimoUsoEm.getTime() > INATIVIDADE_MIN * 60_000;
  if (s.expiraEm.getTime() < agora || inativa) {
    await d.delete(schema.sessao).where(eq(schema.sessao.tokenHash, hash));
    return null;
  }
  if (agora - s.ultimoUsoEm.getTime() > 60_000) {
    await d
      .update(schema.sessao)
      .set({ ultimoUsoEm: sql`now()` })
      .where(eq(schema.sessao.tokenHash, hash));
  }
  return s.usuarioId;
}

export type GestorAtual = {
  id: string;
  nome: string;
  email: string;
  usuario: string;
  perfil: 'gestor_nucleo' | 'admin';
};
export type GestorParcial = GestorAtual & { totpAtivo: boolean };
export type ServidorAtual = {
  id: string;
  nome: string;
  matricula: string;
  usuario: string | null;
  funcao: string | null;
  lotacao: string | null;
};

/** Contas de demonstração deixam de valer no fim do prazo, mesmo com sessão aberta. */
const testeVencido = (ate: Date | null) => Boolean(ate && ate.getTime() < Date.now());

/** Gestor autenticado ou null. Memorizado por requisição. */
export const gestorAtual = cache(async (): Promise<GestorAtual | null> => {
  const id = await lerSessao('gestor');
  if (!id) return null;
  const d = await db();
  const [g] = await d
    .select({
      id: schema.gestor.id,
      nome: schema.gestor.nome,
      email: schema.gestor.email,
      usuario: schema.gestor.usuario,
      perfil: schema.gestor.perfil,
      ativo: schema.gestor.ativo,
      testeAte: schema.gestor.testeAte
    })
    .from(schema.gestor)
    .where(eq(schema.gestor.id, id))
    .limit(1);
  if (!g || !g.ativo || testeVencido(g.testeAte)) return null;
  return { id: g.id, nome: g.nome, email: g.email, usuario: g.usuario, perfil: g.perfil };
});

export const servidorAtual = cache(async (): Promise<ServidorAtual | null> => {
  const id = await lerSessao('servidor');
  if (!id) return null;
  const d = await db();
  const [s] = await d
    .select({
      id: schema.servidor.id,
      nome: schema.servidor.nomeCompleto,
      matricula: schema.servidor.matricula,
      funcao: schema.servidor.funcao,
      lotacao: schema.servidor.lotacao,
      ativo: schema.servidor.ativo,
      testeAte: schema.servidor.testeAte,
      usuario: schema.usuarioPortal.usuario
    })
    .from(schema.servidor)
    .leftJoin(schema.usuarioPortal, eq(schema.usuarioPortal.servidorId, schema.servidor.id))
    .where(eq(schema.servidor.id, id))
    .limit(1);
  if (!s || !s.ativo || testeVencido(s.testeAte)) return null;
  return { id: s.id, nome: s.nome, matricula: s.matricula, usuario: s.usuario, funcao: s.funcao, lotacao: s.lotacao };
});

/** Use no topo de toda página, ação e rota da gestão. Exige a verificação em duas etapas concluída. */
export async function exigirGestor(): Promise<GestorAtual> {
  const g = await gestorAtual();
  if (!g) redirect('/gestao/entrar');
  return g;
}

/** Só o perfil administrador (gestão de contas, base de servidores, auditoria). */
export async function exigirAdmin(): Promise<GestorAtual> {
  const g = await exigirGestor();
  if (g.perfil !== 'admin') redirect('/gestao');
  return g;
}

/** Gestor que já passou pela senha e ainda precisa da segunda etapa. */
export const gestorParcial = cache(async (): Promise<GestorParcial | null> => {
  const id = await lerSessao('gestor', 'senha');
  if (!id) return null;
  const d = await db();
  const [g] = await d.select().from(schema.gestor).where(eq(schema.gestor.id, id)).limit(1);
  if (!g || !g.ativo) return null;
  return {
    id: g.id,
    nome: g.nome,
    email: g.email,
    usuario: g.usuario,
    perfil: g.perfil,
    totpAtivo: Boolean(g.totpSegredo)
  };
});

export async function exigirServidor(): Promise<ServidorAtual> {
  const s = await servidorAtual();
  if (!s) redirect('/entrar');
  return s;
}

/** Servidor no meio do acesso: passou pela senha (login) ou pelo código do e-mail (primeiro acesso). */
export type ServidorParcial = {
  id: string;
  nome: string;
  usuario: string | null;
  totpAtivo: boolean;
  cadastroConcluido: boolean;
};

export const servidorParcial = cache(async (): Promise<ServidorParcial | null> => {
  const id = await lerSessao('servidor', 'senha');
  if (!id) return null;
  const d = await db();
  const [r] = await d
    .select({ sv: schema.servidor, conta: schema.usuarioPortal })
    .from(schema.servidor)
    .innerJoin(schema.usuarioPortal, eq(schema.usuarioPortal.servidorId, schema.servidor.id))
    .where(eq(schema.servidor.id, id))
    .limit(1);
  if (!r || !r.sv.ativo || testeVencido(r.sv.testeAte)) return null;
  return {
    id: r.sv.id,
    nome: r.sv.nomeCompleto,
    usuario: r.conta.usuario,
    totpAtivo: Boolean(r.conta.totpSegredo),
    cadastroConcluido: Boolean(r.conta.primeiroAcessoEm)
  };
});
