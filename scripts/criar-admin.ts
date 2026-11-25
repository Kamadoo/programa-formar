/**
 * Cria (ou recupera) a conta de ADMINISTRADOR. Só roda no terminal do servidor — a interface
 * não cria administradores, de propósito.
 *
 *   npm run admin -- --nome "Nome Completo" --email pessoa@dominio
 *   npm run admin -- --email pessoa@dominio --recuperar     (nova senha + refazer a verificação em duas etapas)
 *
 * Imprime um link de uso único (válido por 2 horas) para definir a senha. Não envia e-mail.
 */
import { eq, sql } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { auditar } from '@/lib/auditoria';
import { gerarHashSenha } from '@/lib/auth/senha';
import { usuarioLivreGestor } from '@/lib/auth/usuario-gestor';
import { sha256, tokenAleatorio } from '@/lib/cripto';
import { env } from '@/lib/env';

function arg(nome: string) {
  const i = process.argv.indexOf('--' + nome);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg('email')?.trim().toLowerCase();
  const nome = arg('nome')?.trim();
  const recuperar = process.argv.includes('--recuperar');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe --email válido.');

  const d = await db();
  let [g] = await d.select().from(s.gestor).where(eq(s.gestor.email, email)).limit(1);

  // Remoção de conta criada por engano: só se nunca entrou e não criou nada.
  if (process.argv.includes('--remover')) {
    if (!g) throw new Error('Não existe conta com esse e-mail.');
    if (g.ultimoLoginEm || g.totpAtivadoEm)
      throw new Error('Essa conta já foi usada; não pode ser removida por aqui. Desative-a pela Administração.');
    const [{ n }] = await d
      .select({ n: sql<number>`count(*)::int` })
      .from(s.formacao)
      .where(eq(s.formacao.criadoPor, g.id));
    if (n > 0) throw new Error('Essa conta já criou formações; não pode ser removida.');
    await d.delete(s.sessao).where(eq(s.sessao.usuarioId, g.id));
    await d.delete(s.gestor).where(eq(s.gestor.id, g.id)); // links de senha e códigos saem junto (cascade)
    await auditar({
      atorTipo: 'sistema',
      acao: 'remover_admin',
      entidade: 'gestor',
      entidadeId: g.id,
      detalhes: { email }
    });
    console.log(`Conta ${email} removida. O link de senha que ela tinha deixou de valer.`);
    return;
  }

  if (!g) {
    if (recuperar) throw new Error('Não existe conta com esse e-mail.');
    if (!nome || nome.length < 3) throw new Error('Informe --nome para criar a conta.');
    [g] = await d
      .insert(s.gestor)
      .values({
        nome,
        email,
        usuario: await usuarioLivreGestor(nome),
        perfil: 'admin',
        senhaHash: await gerarHashSenha(tokenAleatorio(48))
      })
      .returning();
    console.log(`Conta de administrador criada para ${email}.`);
  } else if (g.perfil !== 'admin') {
    if (recuperar) throw new Error('Essa conta não é de administrador.');
    await d.update(s.gestor).set({ perfil: 'admin', ativo: true }).where(eq(s.gestor.id, g.id));
    console.log(`Conta ${email} promovida a administrador.`);
  }

  // Recuperação: invalida senha, verificação em duas etapas e sessões.
  if (recuperar) {
    await d.transaction(async tx => {
      await tx
        .update(s.gestor)
        .set({
          senhaHash: await gerarHashSenha(tokenAleatorio(48)),
          totpSegredo: null,
          totpPendente: null,
          totpAtivadoEm: null,
          totpUltimoPasso: null,
          ativo: true
        })
        .where(eq(s.gestor.id, g.id));
      await tx.delete(s.codigoRecuperacao).where(eq(s.codigoRecuperacao.gestorId, g.id));
      await tx.delete(s.sessao).where(eq(s.sessao.usuarioId, g.id));
    });
    console.log('Senha, verificação em duas etapas e sessões anteriores foram invalidadas.');
  }

  const token = tokenAleatorio();
  await d.update(s.tokenGestor).set({ usadoEm: new Date() }).where(eq(s.tokenGestor.gestorId, g.id));
  await d
    .insert(s.tokenGestor)
    .values({ tokenHash: sha256(token), gestorId: g.id, expiraEm: new Date(Date.now() + 2 * 3600_000) });
  await auditar({
    atorTipo: 'sistema',
    acao: recuperar ? 'recuperar_admin' : 'criar_admin',
    entidade: 'gestor',
    entidadeId: g.id
  });

  console.log(`\nUsuário de acesso: ${g.usuario}   (login da gestão = usuário + senha + código do autenticador)`);
  console.log('\nDefina a senha neste link (vale por 2 horas, uso único):');
  console.log(new URL('/gestao/definir-senha/' + token, env().SITE_URL).toString());
  console.log('\nNo primeiro acesso você vai ativar a verificação em duas etapas.');
}

main().then(
  () => process.exit(0),
  e => {
    console.error('Erro:', e instanceof Error ? e.message : e);
    process.exit(1);
  }
);
