/**
 * Contas de DEMONSTRAÇÃO para alguém conferir o site (ex.: quem for avaliar o sistema), com dados fictícios.
 *
 *   npm run contas-teste:producao -- --criar [--dias 7]   cria gestor + servidor de teste e as formações fictícias
 *   npm run contas-teste:producao -- --remover            apaga tudo o que foi criado como teste
 *
 * Regras de segurança:
 * - Só cria se o banco ainda NÃO tiver servidores reais (antes da importação da base).
 * - Senhas aleatórias, impressas uma única vez. O gestor de teste entra sem a segunda etapa, mas só até o prazo.
 * - E-mails fictícios (@formar.test) nunca entram na fila de envio.
 * - Rode --remover ANTES de importar a base real.
 */
import { randomInt } from 'node:crypto';
import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { gerarHashSenha } from '@/lib/auth/senha';
import { carregarFicticios } from './dados-ficticios';

const EMAIL_GESTOR = 'gestor@formar.test';
const MODELO_TESTE = 'Modelo de teste (demonstração)';

function arg(nome: string) {
  const i = process.argv.indexOf('--' + nome);
  return i > -1 ? process.argv[i + 1] : undefined;
}

/** Senha legível e forte: 4 blocos de 4 caracteres, sem letras ambíguas. */
function senhaAleatoria() {
  const alfabeto = 'abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXY2345679';
  let out = '';
  for (let i = 0; i < 16; i++) out += alfabeto[randomInt(alfabeto.length)];
  return out.match(/.{4}/g)!.join('-');
}

async function criar() {
  const dias = Number(arg('dias') ?? 7);
  if (!Number.isInteger(dias) || dias < 1 || dias > 30)
    throw new Error('--dias deve ser um número inteiro entre 1 e 30.');
  const d = await db();

  const [{ reais }] = await d
    .select({ reais: sql<number>`count(*)::int` })
    .from(s.servidor)
    .where(isNull(s.servidor.testeAte));
  if (reais > 0)
    throw new Error(
      `O banco já tem ${reais} servidor(es) real(is). Contas de teste só podem ser criadas antes da importação da base.`
    );
  const [ja] = await d.select({ id: s.gestor.id }).from(s.gestor).where(eq(s.gestor.email, EMAIL_GESTOR)).limit(1);
  if (ja) throw new Error('As contas de teste já existem. Rode --remover antes de criar de novo.');

  const ate = new Date(Date.now() + dias * 24 * 3600_000);
  const senhaGestor = senhaAleatoria();
  const senhaPortal = senhaAleatoria();

  const [gestor] = await d
    .insert(s.gestor)
    .values({
      nome: 'Gestor(a) de Teste',
      email: EMAIL_GESTOR,
      senhaHash: await gerarHashSenha(senhaGestor),
      perfil: 'gestor_nucleo',
      senhaAlteradaEm: new Date(),
      testeAte: ate
    })
    .returning({ id: s.gestor.id });

  const [modelo] = await d
    .insert(s.modeloCertificado)
    .values({
      nome: MODELO_TESTE,
      assinaturas: [
        { nome: 'Secretário(a) Municipal de Educação', cargo: 'Secretaria Municipal de Educação' },
        { nome: 'Prefeito(a) de Serra Clara', cargo: 'Prefeitura de Serra Clara' }
      ]
    })
    .returning({ id: s.modeloCertificado.id });

  const servidores = await carregarFicticios(d, gestor.id, modelo.id, {
    email: u => `${u}@formar.test`,
    testeAte: ate
  });
  await d
    .update(s.usuarioPortal)
    .set({ usuario: 'maria.silva', senhaHash: await gerarHashSenha(senhaPortal), primeiroAcessoEm: new Date() })
    .where(eq(s.usuarioPortal.servidorId, servidores[0].id));

  const dataBr = ate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
  console.log('\nContas de teste criadas (anote agora: as senhas não aparecem de novo).\n');
  console.log('  Gestão   → https://programaformar.example/gestao/entrar');
  console.log(`             e-mail ${EMAIL_GESTOR}   senha ${senhaGestor}`);
  console.log('  Portal   → https://programaformar.example/entrar');
  console.log(`             usuário maria.silva   senha ${senhaPortal}`);
  console.log(`\n  Valem até ${dataBr} (horário de Brasília). Depois disso, deixam de entrar.`);
  console.log('  Antes de importar a base real: npm run contas-teste:producao -- --remover\n');
}

async function remover() {
  const d = await db();
  const gestores = (await d.select({ id: s.gestor.id }).from(s.gestor).where(isNotNull(s.gestor.testeAte))).map(
    g => g.id
  );
  const servidores = (await d.select({ id: s.servidor.id }).from(s.servidor).where(isNotNull(s.servidor.testeAte))).map(
    x => x.id
  );

  await d.transaction(async tx => {
    // Formações criadas pelo gestor de teste (as fictícias e as que a pessoa avaliadora criar) — apagam encontros, participações, presenças e certificados.
    if (gestores.length) await tx.delete(s.formacao).where(inArray(s.formacao.criadoPor, gestores));
    if (servidores.length) {
      await tx.delete(s.participacao).where(inArray(s.participacao.servidorId, servidores));
      await tx.delete(s.sessao).where(and(eq(s.sessao.tipo, 'servidor'), inArray(s.sessao.usuarioId, servidores)));
      await tx.delete(s.servidor).where(inArray(s.servidor.id, servidores));
    }
    if (gestores.length) {
      await tx.delete(s.sessao).where(and(eq(s.sessao.tipo, 'gestor'), inArray(s.sessao.usuarioId, gestores)));
      await tx.delete(s.gestor).where(inArray(s.gestor.id, gestores));
    }
    await tx.delete(s.modeloCertificado).where(eq(s.modeloCertificado.nome, MODELO_TESTE));
  });
  console.log(
    `Removido: ${gestores.length} gestor(es) e ${servidores.length} servidor(es) de teste, com as formações de teste.`
  );
  console.log('Os registros de auditoria continuam (o banco não permite apagá-los).');
}

const acao = process.argv.includes('--criar') ? criar : process.argv.includes('--remover') ? remover : null;
if (!acao) {
  console.error('Use --criar [--dias 7] ou --remover.');
  process.exit(1);
}
acao().then(
  () => process.exit(0),
  e => {
    console.error('Erro:', e instanceof Error ? e.message : e);
    process.exit(1);
  }
);
